import { Context, Logger } from 'koishi'
import { Page } from 'puppeteer-core'
import { TopicInfo, ApiResponse, SearchResult, FetchResult } from './types'
import { Config } from './config'
import { injectCookies } from './utils'

export function createApi(ctx: Context, config: Config, logger: Logger, debugLog: (...args: any[]) => void) {

    /** 确保 TopicInfo 的可选字段有默认值 */
    const normalizeTopicInfo = (raw: any): TopicInfo => {
        if (!raw) return raw

        let upvotes = raw.Upvotes ?? 0;
        let downvotes = raw.Downvotes ?? 0;
        if (!raw.Upvotes && typeof raw.rating === 'string' && raw.rating.includes('/')) {
            const parts = raw.rating.split('/');
            upvotes = parseInt(parts[0], 10) || 0;
            downvotes = parseInt(parts[1], 10) || 0;
        }

        if (raw.Tags && typeof raw.Tags === 'object') {
            raw.Tags.Rating = raw.Tags.Rating || raw.Tags.Rate;
        }

        return {
            ...raw,
            Upvotes: upvotes,
            Downvotes: downvotes,
            Followers: raw.Followers ?? 0,
            HighPraise: raw.HighPraise ?? 0,
            WordCount: raw.WordCount ?? 0,
        }
    }

    const scrapeThreadFromHtml = async (threadId: string): Promise<FetchResult> => {
        let page: Page
        debugLog(`[Fallback] Starting HTML scrape for thread ${threadId}...`)
        try {
            page = await ctx.puppeteer.page()
            await injectCookies(page, config.cookies)
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

            const targetUrl = `https://fimtale.com/t/${threadId}`
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })

            try {
                await page.waitForSelector('#title, .passage, input[name="username"]', { timeout: 15000 })
            } catch (e) { }

            const pageTitle = await page.title()
            if (pageTitle.includes('404') || pageTitle.includes('Error')) {
                return { valid: false, msg: `页面不存在或服务器错误` }
            }

            const result = await page.evaluate((tid) => {
                if (document.querySelector('input[name="username"]') || document.body.innerText.includes('登录后查看')) {
                    return { error: '内容受限(需登录)' }
                }
                const errorPanel = document.querySelector('.card-panel.red, .card-panel.orange')
                if (errorPanel) return { error: errorPanel.textContent.trim() }

                const titleEl = document.querySelector('#title')
                const title = titleEl?.textContent?.trim() || document.title.replace(' - FimTale', '').trim()

                let userName = '未知作者'
                const authorEl = document.querySelector('.option-bar a[href^="/u/"] .original-colored-text')
                if (authorEl) {
                    const clone = authorEl.cloneNode(true) as HTMLElement
                    clone.querySelectorAll('span').forEach(b => b.remove())
                    userName = clone.textContent?.trim() || '未知作者'
                }

                let content = ''
                let background = null
                const passageEl = document.querySelector('.passage')
                if (passageEl) {
                    const firstImg = passageEl.querySelector('img')
                    if (firstImg) background = firstImg.src

                    const contentClone = passageEl.cloneNode(true) as HTMLElement
                    contentClone.querySelectorAll('img').forEach((img: HTMLImageElement) => {
                        if (img.src) img.setAttribute('src', img.src)
                    })
                    content = contentClone.innerHTML || ''
                }

                let views = 0, comments = 0, words = 0, upvotes = 0, downvotes = 0, followers = 0, highPraise = 0;

                let statEl = document.querySelector('.status-bar span[title*="字"]');
                if (statEl) words = parseInt(statEl.getAttribute('title')?.replace(/[^0-9]/g, '') || statEl.textContent?.replace(/[^0-9]/g, '') || '0');

                statEl = document.querySelector('.status-bar span[title*="阅读"]');
                if (statEl) views = parseInt(statEl.getAttribute('title')?.replace(/[^0-9]/g, '') || statEl.textContent?.replace(/[^0-9]/g, '') || '0');

                statEl = document.querySelector('.status-bar span[title*="评论"]');
                if (statEl) comments = parseInt(statEl.getAttribute('title')?.replace(/[^0-9]/g, '') || statEl.textContent?.replace(/[^0-9]/g, '') || '0');

                statEl = document.querySelector('span[title*="赞"] .upvote-num') || document.querySelector('.upvote-num');
                if (statEl) upvotes = parseInt(statEl.textContent?.replace(/[^0-9]/g, '') || '0');

                statEl = document.querySelector('.downvote-num');
                if (statEl) downvotes = parseInt(statEl.textContent?.replace(/[^0-9]/g, '') || '0');

                statEl = document.querySelector('.favorite-num');
                if (statEl) followers = parseInt(statEl.textContent?.replace(/[^0-9]/g, '') || '0');

                statEl = document.querySelector('.high-praise-num');
                if (statEl) highPraise = parseInt(statEl.textContent?.replace(/[^0-9]/g, '') || '0');

                const tagList: string[] = []
                document.querySelectorAll('.title-tags .chip span').forEach(el => {
                    const t = el.textContent?.trim()
                    if (t) tagList.push(t)
                })

                let tType = 'Scraped', tRating = tagList.includes('血腥暴力') || tagList.includes('轻微性暗示') ? 'R' : 'General', tLength = '', tSource = '';
                document.querySelectorAll('.main-tag-set div').forEach(el => {
                    const txt = el.textContent?.trim() || '';
                    const title = el.getAttribute('title') || '';
                    if (title.includes('读') || ['E', 'T', 'M', 'R'].includes(txt)) tRating = txt;
                    else if (title.includes('篇幅') || ['短', '中', '长'].includes(txt)) tLength = txt;
                    else if (title.includes('译') || title.includes('原')) tSource = txt;
                    else tType = txt;
                });

                const topicInfo = {
                    ID: parseInt(tid),
                    Title: title,
                    UserName: userName,
                    Content: content || '<p>正文提取失败</p>',
                    DateCreated: Date.now(),
                    Views: views,
                    Comments: comments,
                    Background: background,
                    WordCount: words,
                    Upvotes: upvotes,
                    Downvotes: downvotes,
                    Followers: followers,
                    HighPraise: highPraise,
                    IsChapter: false,
                    Tags: {
                        Type: tType,
                        Rating: tRating,
                        Length: tLength,
                        Source: tSource,
                        OtherTags: tagList
                    }
                }

                const menu = []
                document.querySelectorAll('ul#menu li').forEach(li => {
                    const a = li.querySelector('a')
                    if (!a) return
                    const rightSpan = a.querySelector('.right')
                    if (rightSpan) rightSpan.remove()
                    const itemTitle = a.textContent?.trim() || '无题'

                    if (itemTitle.includes('收起') || a.querySelector('i')?.textContent?.includes('')) return;

                    let itemID = null
                    const href = a.getAttribute('href')
                    if (href && href.match(/\/t\/(\d+)/)) {
                        itemID = parseInt(href.match(/\/t\/(\d+)/)[1])
                    } else if (li.classList.contains('active')) {
                        itemID = parseInt(tid)
                    }

                    if (itemID !== null) {
                        menu.push({ ID: itemID, Title: itemTitle })
                    }
                })

                let parentInfo = null
                if (menu.length > 0) {
                    parentInfo = {
                        ID: menu[0].ID,
                        Title: menu[0].Title,
                    }
                    if (menu.length > 1 && parseInt(tid) !== menu[0].ID) {
                        topicInfo.IsChapter = true
                        parentInfo.Title = document.title.replace(' - FimTale', '').trim()
                    } else {
                        parentInfo = { ID: parseInt(tid), Title: topicInfo.Title }
                    }
                } else {
                    parentInfo = { ID: parseInt(tid), Title: topicInfo.Title }
                }

                return { topic: topicInfo, menu: menu, parent: parentInfo }
            }, threadId)

            if (result.error) {
                return { valid: false, msg: `网页提示: ${result.error}` }
            }

            debugLog(`[Fallback] Scrape complete. Title: ${result.topic.Title}, Menu Items: ${result.menu.length}`)

            return {
                valid: true,
                data: result.topic,
                parent: result.parent,
                menu: result.menu
            }

        } catch (e) {
            logger.error(`[Fallback] Scrape critical error for ${threadId}:`, e)
            return { valid: false, msg: `爬虫错误: ${e.message}` }
        } finally {
            if (page) await page.close()
        }
    }

    const fetchThread = async (threadId: string): Promise<FetchResult> => {
        const runApi = async () => {
            const url = `${config.apiUrl}/t/${threadId}`
            const params = { APIKey: config.apiKey, APIPass: config.apiPass }
            try {
                debugLog(`[API] Fetching: ${url}`)
                const rawRes = await ctx.http.get(url, { params, responseType: 'text' })

                if (!rawRes) return { success: false, msg: 'Empty Response' }
                if (rawRes.includes('Fatal error') || rawRes.includes('<b>Warning</b>')) {
                    debugLog(`[API] Server Error detected.`)
                    return { success: false, msg: 'Server Fatal Error' }
                }

                const jsonStartMarker = '{"Status":'
                const idx = rawRes.indexOf(jsonStartMarker)
                if (idx === -1) return { success: false, msg: 'Invalid JSON' }

                const res = JSON.parse(rawRes.substring(idx)) as ApiResponse
                if (res.Status !== 1 || !res.TopicInfo) return { success: false, msg: res.ErrorMessage || 'API Status Error' }

                // 标准化字段名
                const data = normalizeTopicInfo(res.TopicInfo)
                const parent = res.ParentInfo ? normalizeTopicInfo(res.ParentInfo) : undefined

                // Fimtale的 /t/{id} API 没给出全书总字数，直接以极快速度请求一次无头原版 HTML 获取补充字段
                const targetId = parent ? parent.ID : data.ID;
                try {
                    const webUrl = url.replace('/api/v1', '');
                    const html = await ctx.http.get(webUrl, { headers: config.cookies ? { Cookie: config.cookies } : {}, responseType: 'text' })

                    const wordsMatch = html.match(/title="共\s*([0-9,]+)\s*字"/);
                    if (wordsMatch) {
                        const count = parseInt(wordsMatch[1].replace(/,/g, ''), 10);
                        if (parent) parent.WordCount = Math.max(parent.WordCount || 0, count);
                        else data.WordCount = Math.max(data.WordCount || 0, count);
                    }

                    const favMatch = html.match(/class="favorite-num[^>]*>\s*([0-9,]+)\s*<\//);
                    if (favMatch) {
                        const count = parseInt(favMatch[1].replace(/,/g, ''), 10);
                        if (parent) parent.Followers = Math.max(parent.Followers || 0, count);
                        else data.Followers = Math.max(data.Followers || 0, count);
                    }

                    const hpMatch = html.match(/class="high-praise-num[^>]*>\s*([0-9,]+)\s*<\//);
                    if (hpMatch) {
                        const count = parseInt(hpMatch[1].replace(/,/g, ''), 10);
                        if (parent) parent.HighPraise = Math.max(parent.HighPraise || 0, count);
                        else data.HighPraise = Math.max(data.HighPraise || 0, count);
                    }

                    const downMatch = html.match(/class="downvote-num[^>]*>\s*([0-9,]+)\s*<\//);
                    if (downMatch) {
                        const count = parseInt(downMatch[1].replace(/,/g, ''), 10);
                        if (parent) parent.Downvotes = Math.max(parent.Downvotes || 0, count);
                        else data.Downvotes = Math.max(data.Downvotes || 0, count);
                    }
                } catch (e) {
                    debugLog(`[API] Supplement True Details failed: ` + e.message)
                }

                return { success: true, data, parent, menu: res.Menu || [] }
            } catch (e) {
                return { success: false, msg: e.message }
            }
        }

        const apiRes = await runApi()

        if (apiRes.success) {
            debugLog(`[API] Success for ${threadId}`)
            return { valid: true, data: apiRes.data, parent: apiRes.parent, menu: apiRes.menu }
        }

        debugLog(`[API] Failed for ${threadId} (${apiRes.msg}). Checking fallback...`)

        if (config.enableFallback) {
            const scrapeRes = await scrapeThreadFromHtml(threadId)
            if (scrapeRes.valid) {
                return { valid: true, data: scrapeRes.data, parent: scrapeRes.parent, menu: scrapeRes.menu }
            } else {
                return { valid: false, msg: `API错误且${scrapeRes.msg}` }
            }
        }

        return { valid: false, msg: `API请求失败: ${apiRes.msg}` }
    }

    const fetchRandomId = async () => {
        try {
            debugLog('Fetching random thread ID...')
            const headers = config.cookies ? { Cookie: config.cookies } : {}
            const html = await ctx.http.get('https://fimtale.com/rand', { responseType: 'text', headers })
            let match = html.match(/FimTale\.topic\.init\((\d+)/) || html.match(/data-clipboard-text=".*?\/t\/(\d+)"/)
            return match ? match[1] : null
        } catch (e) {
            return null
        }
    }

    const searchThreads = async (keyword: string): Promise<SearchResult[]> => {
        debugLog(`Starting API search for keyword: "${keyword}"`)
        try {
            const url = `${config.apiUrl}/topics`;
            const params = { APIKey: config.apiKey, APIPass: config.apiPass, Keyword: keyword };
            const rawRes = await ctx.http.get(url, { params, responseType: 'text' });
            const idx = rawRes.indexOf('{"Status":');
            if (idx === -1) return [];

            const res = JSON.parse(rawRes.substring(idx));
            if (res.Status !== 1 || !res.TopicArray) return [];

            const items: SearchResult[] = [];
            for (const t of res.TopicArray.slice(0, 6)) {
                // 构建tags
                const tags: string[] = [];
                if (t.Tags) {
                    if (t.Tags.Type) tags.push(t.Tags.Type);
                    if (t.Tags.Rating && t.Tags.Rating !== 'E') tags.push(t.Tags.Rating);
                    if (t.Tags.Length) tags.push(t.Tags.Length);
                    if (t.Tags.OtherTags) tags.push(...t.Tags.OtherTags);
                }

                // 计算更新时间
                const dt = new Date(t.DateUpdated * 1000);
                const updateTime = `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`;

                // 解析likes
                let likes = t.HighPraise || t.Upvotes || 0;
                if (!likes && typeof t.rating === 'string' && t.rating.includes('/')) {
                    likes = parseInt(t.rating.split('/')[0], 10) || 0;
                }

                items.push({
                    id: String(t.ID),
                    title: t.Title,
                    author: t.UserName,
                    cover: (t.Background && !t.Background.includes('avatar') && !t.Background.includes('upload')) ? t.Background : undefined,
                    tags: tags.slice(0, 8),
                    status: t.Tags?.Status || '',
                    stats: {
                        views: String(t.Views || 0),
                        comments: String(t.Comments || 0),
                        likes: String(likes),
                        words: String(t.WordCount || 0),
                        followers: String(t.Followers || 0)
                    },
                    updateTime
                });
            }
            return items;
        } catch (e) {
            debugLog(`Search fallback failed: ${e.message}`);
            return [];
        }
    }

    return { fetchThread, fetchRandomId, searchThreads }
}
