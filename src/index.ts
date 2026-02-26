import { Context, Schema } from 'koishi'
import { } from 'koishi-plugin-puppeteer'
import { createApi } from './api'
import { createRenderer } from './renderer'
import { registerCommands } from './commands'

// 重新导出其他类型
export * from './types'

export const name = 'fimtale-api'
export const inject = ['puppeteer', 'database', 'http']

export interface Config {
  apiUrl: string
  apiKey: string
  apiPass: string
  cookies: string
  pollInterval: number
  autoParseLink: boolean
  deviceWidth: number
  deviceHeight: number
  fontSize: number
  debug: boolean
  enableFallback: boolean
}

export const Config: Schema<Config> = Schema.object({
  apiUrl: Schema.string().default('https://fimtale.com/api/v1').description('Fimtale API 基础路径'),
  apiKey: Schema.string().role('secret').required().description('API Key (必填)'),
  apiPass: Schema.string().role('secret').required().description('API Pass (必填)'),
  cookies: Schema.string().role('secret').description('浏览器 Cookie (用于解除安全模式)'),
  pollInterval: Schema.number().default(60 * 1000).description('追更轮询间隔(ms)'),
  autoParseLink: Schema.boolean().default(true).description('自动解析链接为预览卡片'),
  deviceWidth: Schema.number().default(390).description('阅读器渲染宽度(px)'),
  deviceHeight: Schema.number().default(844).description('阅读器渲染高度(px)'),
  fontSize: Schema.number().default(20).description('正文字号(px)'),
  debug: Schema.boolean().default(false).description('开启详细调试日志'),
  enableFallback: Schema.boolean().default(true).description('API失败时尝试直接爬取网页(降级策略)'),
})

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('fimtale')

  const debugLog = (msg: string, ...args: any[]) => {
    if (config.debug) {
      logger.info(`[DEBUG] ${msg}`, ...args)
    }
  }

  // 注册数据库表
  ctx.model.extend('fimtale_subs', {
    id: 'unsigned',
    cid: 'string',
    threadId: 'string',
    lastCount: 'integer',
    lastCheck: 'integer',
  }, { primary: 'id', autoInc: true })

  // 初始化各模块
  const api = createApi(ctx, config, logger, debugLog)
  const renderer = createRenderer(ctx, config, logger, debugLog)

  // 注册命令、中间件、定时任务
  registerCommands(ctx, config, logger, debugLog, api, renderer)
}