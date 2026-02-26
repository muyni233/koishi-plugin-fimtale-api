import { Context, h, Logger } from 'koishi'
import { Config } from './config'
import { createApi } from './api'
import { createRenderer } from './renderer'

export function registerCommands(
    ctx: Context,
    config: Config,
    logger: Logger,
    debugLog: (...args: any[]) => void,
    api: ReturnType<typeof createApi>,
    renderer: ReturnType<typeof createRenderer>,
) {
    const { fetchThread, fetchRandomId, searchThreads } = api
    const { renderCard, renderSearchResults, renderReadPages } = renderer

    // ft.info - 预览作品
    ctx.command('ft.info <threadId:string>', '预览作品').action(async ({ session }, threadId) => {
        debugLog(`CMD ft.info triggered by ${session.userId} for ID: ${threadId}`)
        if (!threadId) return '请输入ID'
        const res = await fetchThread(threadId)
        if (!res.valid) return `[错误] ${res.msg}`
        return session.send(h.image(await renderCard(res.data!, res.parent), 'image/jpeg'))
    })

    // ft.read - 阅读章节
    ctx.command('ft.read <threadId:string>', '阅读章节').action(async ({ session }, threadId) => {
        debugLog(`CMD ft.read triggered by ${session.userId} for ID: ${threadId}`)
        if (!threadId) return '请输入ID'
        const res = await fetchThread(threadId)
        if (!res.valid) return `[错误] 读取失败: ${res.msg}`
        await session.send(`[加载中] ${res.data!.Title}...`)
        try {
            const cardImg = await renderCard(res.data!, res.parent)
            await session.send(h.image(cardImg, 'image/jpeg'))
            const pages = await renderReadPages(res.data!)
            const nodes = pages.map(buf => h('message', h.image(buf, 'image/jpeg')))
            const navs = []
            const mainId = res.parent ? res.parent.ID : res.data!.ID
            navs.push(`[首页] /ft.read ${mainId}`)

            if (res.menu?.length) {
                const idx = res.menu.findIndex(m => m.ID.toString() === threadId)
                if (idx > 0) navs.push(`[上一章] /ft.read ${res.menu[idx - 1].ID}`)
                if (idx < res.menu.length - 1) navs.push(`[下一章] /ft.read ${res.menu[idx + 1].ID}`)
            }
            if (navs.length) nodes.push(h('message', h.text('章节导航:\n' + navs.join('\n'))))
            return session.send(h('message', { forward: true }, nodes))
        } catch (e) {
            logger.error('ft.read rendering failed:', e)
            return '[错误] 渲染失败'
        }
    })

    // ft.random - 随机作品
    ctx.command('ft.random', '随机作品').action(async ({ session }) => {
        debugLog(`CMD ft.random triggered by ${session.userId}`)
        const id = await fetchRandomId()
        if (!id) return '[错误] 获取失败'
        const res = await fetchThread(id)
        if (!res.valid) return `[错误] ID:${id} 读取失败`
        await session.send(h.image(await renderCard(res.data!, res.parent), 'image/jpeg'))
        return `Tip: 发送 /ft.read ${res.data!.ID} 阅读全文`
    })

    // ft.search - 搜索作品
    ctx.command('ft.search <keyword:text>', '搜索作品').action(async ({ session }, keyword) => {
        debugLog(`CMD ft.search triggered by ${session.userId} for "${keyword}"`)
        if (!keyword) return '请输入关键词'
        await session.send('[加载中] 搜索中...')
        const results = await searchThreads(keyword)
        if (!results.length) return '未找到结果。'
        await session.send(h.image(await renderSearchResults(keyword, results), 'image/jpeg'))
        const exampleId = results[0]?.id || '12345'
        return `Tip: 发送 /ft.read [ID] 阅读 (例: /ft.read ${exampleId})`
    })

    // ft.sub - 订阅
    ctx.command('ft.sub <threadId:string>', '订阅').action(async ({ session }, threadId) => {
        debugLog(`CMD ft.sub triggered by ${session.userId} for ID: ${threadId}`)
        if (!/^\d+$/.test(threadId)) return 'ID错误'
        const exist = await ctx.database.get('fimtale_subs', { cid: session.cid, threadId })
        if (exist.length) return '已订阅'
        const res = await fetchThread(threadId)
        if (!res.valid) return '帖子不存在'
        await ctx.database.create('fimtale_subs', { cid: session.cid, threadId, lastCount: res.data!.Comments, lastCheck: Date.now() })
        await session.send('[成功] 订阅成功')
        return session.send(h.image(await renderCard(res.data!, res.parent), 'image/jpeg'))
    })

    // ft.unsub - 退订
    ctx.command('ft.unsub <threadId:string>', '退订').action(async ({ session }, threadId) => {
        debugLog(`CMD ft.unsub triggered by ${session.userId} for ID: ${threadId}`)
        const res = await ctx.database.remove('fimtale_subs', { cid: session.cid, threadId })
        return res.matched ? '[成功] 已退订' : '未找到订阅'
    })

    // 中间件 - 自动解析链接
    ctx.middleware(async (session, next) => {
        if (!config.autoParseLink) return next()
        const matches = [...session.content.matchAll(/fimtale\.(?:com|net)\/t\/(\d+)/g)]
        if (matches.length === 0) return next()

        debugLog(`Middleware matched link in channel ${session.channelId}`)
        const uniqueIds = [...new Set(matches.map(m => m[1]))]
        if (session.userId === session.selfId) return next()

        const messageNodes = []
        for (const id of uniqueIds) {
            try {
                const res = await fetchThread(id)
                if (res.valid) {
                    const img = await renderCard(res.data!, res.parent)
                    messageNodes.push(h('message', h.image(img, 'image/jpeg')))
                }
            } catch (e) {
                logger.error(`Middleware failed to process link ${id}:`, e)
            }
        }

        if (messageNodes.length === 0) return next()

        if (messageNodes.length === 1) {
            return session.send(messageNodes[0].children)
        } else {
            return session.send(h('message', { forward: true }, messageNodes))
        }
    })

    // 定时任务 - 订阅轮询
    ctx.setInterval(async () => {
        const subs = await ctx.database.get('fimtale_subs', {})
        if (!subs.length) return
        debugLog(`Polling check started for ${subs.length} subscriptions.`)
        const tids = [...new Set(subs.map(s => s.threadId))]
        for (const tid of tids) {
            const res = await fetchThread(tid)
            if (!res.valid) continue
            const targets = subs.filter(s => s.threadId === tid && s.lastCount < res.data!.Comments)
            if (targets.length) {
                debugLog(`Update found for thread ${tid} (Old: ${targets[0].lastCount}, New: ${res.data!.Comments})`)
                const msg = `[更新] ${res.data!.Title} 更新了！\n回复: ${res.data!.Comments}\nhttps://fimtale.com/t/${tid}`
                for (const sub of targets) {
                    try {
                        await ctx.broadcast([sub.cid], h.parse(msg))
                        await ctx.database.set('fimtale_subs', { id: sub.id }, { lastCount: res.data!.Comments })
                    } catch (e) {
                        logger.error(`Broadcast failed for sub ${sub.id}:`, e)
                    }
                }
            }
        }
    }, config.pollInterval)
}
