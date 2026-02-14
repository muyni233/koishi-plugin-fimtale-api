import { Context, Schema, h } from 'koishi'
import axios, { AxiosRequestConfig } from 'axios'

export const inject = ['database']

declare module 'koishi' {
  interface Tables {
    phimg_config: GroupConfig
  }
}

const translationTable: Record<string, string> = {
  '；': ';',
  '：': ':',
  '，': ',',
  '（': '(',
  '）': ')',
  '【': '[',
  '】': ']',
  '《': '<',
  '》': '>',
  '？': '?',
  '！': '!',
  '。': '.',
  '、': ',',
}

function translateText(text: string) {
  if (!text) return text
  return text.split('').map(char => translationTable[char] || char).join('')
}

export interface Config {
  apiKey: string
  apiUrl: string
  defaultTags: string[]
  enabledByDefault: boolean
  useGlobalTagsByDefault: boolean
  proxy: string
  timeout: number
}

export const Config: Schema<Config> = Schema.object({
  apiKey: Schema.string().description('Philomena API 密钥').default(''),
  apiUrl: Schema.string().description('Philomena API 域名 (例如 derpibooru.org)').default('derpibooru.org'),
  defaultTags: Schema.array(String).description('全局默认标签').default(['safe']),
  enabledByDefault: Schema.boolean().description('新群聊默认启用搜图功能').default(true),
  useGlobalTagsByDefault: Schema.boolean().description('新群聊默认启用全局标签').default(true),
  proxy: Schema.string().description('代理服务器 (例如 http://127.0.0.1:7890)').default(''),
  timeout: Schema.number().description('请求超时时间 (秒)').default(30),
})

interface GroupConfig {
  id?: number
  groupId: string
  enabled: boolean
  useGlobalTags: boolean
  customTags: string[]
}

export function apply(ctx: Context, config: Config) {
  ctx.model.extend('phimg_config', {
    id: 'unsigned',
    groupId: 'string',
    enabled: 'boolean',
    useGlobalTags: 'boolean',
    customTags: 'list',
  }, {
    autoInc: true,
    primary: 'id',
    unique: ['groupId'],
  })

  const getGroupConfig = async (groupId: string): Promise<GroupConfig> => {
    let [groupConfig] = await ctx.database.get('phimg_config', { groupId })
    if (!groupConfig) {
      groupConfig = await ctx.database.create('phimg_config', {
        groupId,
        enabled: config.enabledByDefault,
        useGlobalTags: config.useGlobalTagsByDefault,
        customTags: []
      })
    }
    return groupConfig
  }

  const updateGroupConfig = async (groupId: string, data: Partial<GroupConfig>) => {
    await ctx.database.set('phimg_config', { groupId }, data)
  }

  const makeRequest = async (method: 'images' | 'reverse', params: any) => {
    let domain = config.apiUrl
    if (domain.includes('://')) {
      domain = domain.split('://')[1]
    }
    domain = domain.split('/')[0]
    const url = `https://${domain}/api/v1/json/search/${method}`
    
    const axiosConfig: AxiosRequestConfig = {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Phimg for Koishi'
      },
      timeout: config.timeout * 1000
    }

    if (config.proxy) {
      try {
        const urlParsed = new URL(config.proxy)
        axiosConfig.proxy = {
          host: urlParsed.hostname,
          port: parseInt(urlParsed.port),
          protocol: urlParsed.protocol.replace(':', '')
        }
      } catch (e) {
        ctx.logger.warn(`Invalid proxy URL: ${config.proxy}`)
      }
    }

    try {
      let response
      if (method === 'images') {
        response = await axios.get(url, { ...axiosConfig, params })
      } else {
        const formData = new URLSearchParams()
        for (const key in params) {
          formData.append(key, params[key])
        }
        response = await axios.post(url, formData, axiosConfig)
      }

      if (response.data.total === 0) {
        throw new Error('未找到匹配的图片')
      }

      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) throw new Error('未找到匹配的图片')
        throw new Error(`API 请求失败: ${error.message}`)
      }
      throw error
    }
  }

  const VIDEO_TYPES = ['webm', 'mp4']

  const getMediaElement = (selected: any) => {
    const file = selected.representations.full
    const url = file.endsWith('.webm') ? selected.representations.medium : selected.representations.large
    const fileType = file.split('.').pop()?.toLowerCase() || ''
    
    if (VIDEO_TYPES.includes(fileType)) {
      return h.video(url)
    } else {
      return h.image(url)
    }
  }

  const searchHelp = `用法: /搜图 [tags|distance]

输入标签为tags搜图；输入匹配距离为图搜图

可选项:
  --tags             获取当前群聊内置标签列表
  --status           获取当前群聊的搜图功能状态
  --pp [per_page]    每页结果数量，默认为50
  --p [page]         页码，默认为1
  --sf [sf]          排序字段，默认为score
  --sd [sd]          排序方向，默认为desc
  --i [index]        选择结果索引，默认为-1（即随机）

示例：
  /搜图 [tags] # 直接通过标签搜索图片

提示: 
  图搜图使用方式为引用图片，默认匹配距离为0.25
  所有参数及变量全部遵循呆站（Philomena系图站）搜索API规范`

  const configHelp = `用法: .搜图-c [选项]

可选项:
  --add [tags]       添加标签，多个标签用逗号分隔
  --rm [tags]        删除标签，多个标签用逗号分隔
  --on               开启当前群聊的搜图功能
  --off              关闭当前群聊的搜图功能
  --onglobal         启用全局标签
  --offglobal        关闭全局标签
`

  ctx.command('搜图 [params:text]', '从图站搜索图片')
    .option('tags', '--tags 获取当前群聊内置标签列表')
    .option('status', '--status 获取当前群聊的搜图功能状态')
    .option('pp', '--pp <per_page:number> 每页结果数量，默认为50', { fallback: 50 })
    .option('p', '--p <page:number> 页码，默认为1', { fallback: 1 })
    .option('sf', '--sf <sf:string> 排序字段，默认为score', { fallback: 'score' })
    .option('sd', '--sd <sd:string> 排序方向，默认为desc', { fallback: 'desc' })
    .option('i', '--i <index:number> 选择结果索引，默认为-1（即随机）', { fallback: -1 })
    .action(async ({ session, options }, params) => {
      if (!session?.guildId) return '搜图仅限群聊使用。'

      // 检查用户是否真的输入了内容 (排除 fallback 选项)
      // session.argv.tokens[0] 是命令名，之后的才是用户输入
      const tokens = session.argv?.tokens || []
      if (!params && tokens.length <= 1 && !session.quote) {
        return searchHelp
      }
      
      const groupId = session.guildId
      const groupConfig = await getGroupConfig(groupId)

      if (options.status) {
        return `当前群聊搜图功能状态：
 启用：${groupConfig.enabled}
 标签：${groupConfig.customTags.join(', ') || '无'}
 全局标签：${groupConfig.useGlobalTags ? '启用' : '禁用'}`
      }

      if (options.tags) {
        return `当前群聊内置标签：${groupConfig.customTags.join(', ') || '无'}`
      }

      if (!groupConfig.enabled) {
        return '搜图未在本群开启，管理员请用 "搜图-c --on" 启动'
      }

      params = translateText(params || '')
      
      let imageUrl: string | undefined
      const quote = session.quote
      if (quote) {
        const imgElement = h.select(quote.content, 'image')[0]
        if (imgElement) {
          imageUrl = imgElement.attrs.url
        }
      }

      try {
        if (imageUrl) {
          let distance = 0.25
          if (params) {
            if (!isNaN(Number(params))) {
              distance = Number(params)
            } else {
              return '图片搜索仅支持数字参数，表示相似度距离（distance）。'
            }
          }

          const queryParams: any = {
            key: config.apiKey,
            url: imageUrl,
            distance: distance
          }

          const data = await makeRequest('reverse', queryParams)
          const images = data.images
          
          if (images.length > 10) {
            return `搜索到过多图片 (${images.length} 张)，请尝试减小距离参数。`
          }

          let result = ''
          result += h('at', { id: session.userId }).toString()
          result += `\ndistance: ${distance}`
          for (const img of images) {
            result += getMediaElement(img).toString()
            result += `\nid: ${img.id}\nscore: ${img.score}`
          }
          return result
        } else {
          const userTags = params ? params.split(',').map(t => t.trim()).filter(t => t) : []
          const globalTags = groupConfig.useGlobalTags ? config.defaultTags : []
          const groupTags = groupConfig.customTags
          const allTags = [...new Set([...groupTags, ...globalTags, ...userTags])]

          const queryParams: any = {
            q: allTags.join(', '),
            key: config.apiKey,
            per_page: options.pp,
            page: options.p,
            sf: options.sf,
            sd: options.sd,
          }

          const data = await makeRequest('images', queryParams)
          const images = data.images

          let index = options.i
          let additionalMsg = ''
          if (index < 0 || index >= images.length) {
            if (index >= 0) {
              additionalMsg = `索引 ${index} 超出单页范围，已随机选择图片`
            }
            index = Math.floor(Math.random() * images.length)
          }

          const selected = images[index]
          let result = ''
          result += h('at', { id: session.userId }).toString()
          result += getMediaElement(selected).toString()
          result += `\nid: ${selected.id}\nscore: ${selected.score}`
          result += `\ntags: ${queryParams.q}`
          if (additionalMsg) result += `\n提示：${additionalMsg}`
          
          return result
        }
      } catch (error) {
        return error instanceof Error ? error.message : String(error)
      }
    })

  const confirmOffGlobal = new Set<string>()

  ctx.command('搜图-c', '配置搜图功能', { authority: 3 })
    .option('on', '--on 开启当前群聊的搜图功能')
    .option('off', '--off 关闭当前群聊的搜图功能')
    .option('onglobal', '--onglobal 启用全局标签')
    .option('offglobal', '--offglobal 关闭全局标签')
    .option('add', '--add <tags:string> 添加标签，多个标签用逗号分隔')
    .option('rm', '--rm <tags:string> 删除标签，多个标签用逗号分隔')
    .action(async ({ session, options }) => {
      if (!session?.guildId) return '搜图配置仅限群聊使用。'

      const tokens = session.argv?.tokens || []
      if (tokens.length <= 1) {
        return configHelp
      }

      const groupId = session.guildId
      const groupConfig = await getGroupConfig(groupId)

      let response = ''

      if (options.on && options.off) {
        return '不能同时开启和关闭搜图功能，请选择一个操作'
      }

      if (options.on) {
        await updateGroupConfig(groupId, { enabled: true })
        response += '搜图功能已在本群开启\n'
      } else if (options.off) {
        await updateGroupConfig(groupId, { enabled: false })
        response += '搜图功能已在本群关闭\n'
      }

      if (options.onglobal && options.offglobal) {
        return '不能同时开启和关闭全局标签，请选择一个操作'
      }

      if (options.onglobal) {
        await updateGroupConfig(groupId, { useGlobalTags: true })
        response += '全局标签已启用\n'
      } else if (options.offglobal) {
        const confirmKey = `${session.guildId}-${session.userId}`
        if (!confirmOffGlobal.has(confirmKey)) {
          confirmOffGlobal.add(confirmKey)
          ctx.setTimeout(() => confirmOffGlobal.delete(confirmKey), 60000)
          return '关闭全局标签，机器人将会搜出非safe图片\n请自行承担可能的炸群风险\n再输入一遍指令确认关闭'
        }
        confirmOffGlobal.delete(confirmKey)
        await updateGroupConfig(groupId, { useGlobalTags: false })
        response += '全局标签已禁用\n'
      }

      if (options.add || options.rm) {
        const currentTags = groupConfig.customTags
        let newTags = [...currentTags]

        if (options.add) {
          const tagsToAdd = translateText(options.add).split(',').map(t => t.trim()).filter(t => t)
          newTags = [...new Set([...newTags, ...tagsToAdd])]
        }

        if (options.rm) {
          const tagsToRm = translateText(options.rm).split(',').map(t => t.trim()).filter(t => t)
          newTags = newTags.filter(t => !tagsToRm.includes(t))
        }

        await updateGroupConfig(groupId, { customTags: newTags })
        response += `修改成功，本群标签现为: ${newTags.join(', ') || '无'}\n`
      }

      return response.trim() || '请输入有效的配置选项。可用 "搜图-c --help" 查看帮助。'
    })
}
