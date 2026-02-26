import { Context, Logger } from 'koishi'
import { TopicInfo, SearchResult } from './types'
import { Config } from './config'
import { stripHtml, summarizeHtml, extractImage, generateGradient, cleanContent, injectCookies, fontStack, fontSerif } from './utils'

const ICONS = {
    views: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>',
    comments: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>',
    likes: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>',
    followers: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>',
    hp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
    words: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z"/></svg>',
}

export function createRenderer(ctx: Context, config: Config, logger: Logger, debugLog: (...args: any[]) => void) {

    const renderCard = async (info: TopicInfo, parent?: TopicInfo) => {
        debugLog(`Rendering Card for ID: ${info.ID}`)
        const isChapter = info.IsChapter || (!!parent && parent.ID !== info.ID)
        const displayTitle = isChapter && parent ? parent.Title : info.Title

        let displayCover = info.Background || extractImage(info.Content)

        if (!displayCover && parent) {
            displayCover = parent.Background
            if (!displayCover && parent.Content) displayCover = extractImage(parent.Content)
        }

        const displayTagsObj = isChapter && parent ? parent.Tags : info.Tags
        const subTitle = isChapter ? info.Title : null
        const bgStyle = displayCover ? `background-image: url('${displayCover}');` : `background: ${generateGradient(displayTitle)};`

        let summary = summarizeHtml(info.Content)
        if (stripHtml(summary).length < 10 && parent && isChapter) {
            summary = summarizeHtml(parent.Content)
        }
        if (!stripHtml(summary)) summary = "暂无简介"

        const tagsArr = []
        if (displayTagsObj?.Type) tagsArr.push(displayTagsObj.Type)
        if (displayTagsObj?.Rating && displayTagsObj.Rating !== 'E') tagsArr.push(displayTagsObj.Rating)
        if (displayTagsObj?.OtherTags) tagsArr.push(...displayTagsObj.OtherTags)

        // 统计：若同时具有章节和父话题数据，保留最大值以展现全书总数据（Fimtale /topics 补充逻辑支持）
        const likes = Math.max(info.Upvotes || 0, parent?.Upvotes || 0)
        const wordCount = Math.max(info.WordCount || 0, parent?.WordCount || 0)
        const followers = Math.max(info.Followers || 0, parent?.Followers || 0)
        const highPraise = Math.max(info.HighPraise || 0, parent?.HighPraise || 0)

        const html = `<!DOCTYPE html><html><head><style>
        body { margin: 0; padding: 0; font-family: ${fontStack}; background: transparent; }
        .card { width: 620px; min-height: 420px; background: #fff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); display: flex; overflow: hidden; }
        .cover { width: 220px; min-height: 100%; ${bgStyle} background-size: cover; background-position: center; position: relative; flex-shrink: 0; }
        .id-badge-container {
            position: absolute; top: 15px; left: 15px;
            display: flex;
            box-shadow: 0 4px 12px rgba(238,110,115, 0.3);
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.3);
            height: 28px;
        }
        .id-label {
            background: #EE6E73;
            color: #fff;
            padding: 0 10px;
            font-size: 12px;
            font-weight: bold;
            font-family: sans-serif;
            text-transform: uppercase;
            display: flex; align-items: center; justify-content: center;
            height: 100%;
            line-height: 1; margin: 0;
        }
        .id-val {
            background: #fff;
            color: #EE6E73;
            padding: 0 12px;
            font-family: "Consolas", "Monaco", monospace;
            font-size: 15px;
            font-weight: 900;
            display: flex; align-items: center; justify-content: center;
            height: 100%;
            line-height: 1; margin: 0;
        }
        .info { flex: 1; padding: 26px; display: flex; flex-direction: column; overflow: hidden; position: relative; }
        .header-group { flex-shrink: 0; margin-bottom: 16px; border-bottom: 2px solid #f5f5f5; padding-bottom: 12px; }
        .title { font-size: 24px; font-weight: 700; color: #333; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 6px; }
        .subtitle { font-size: 16px; color: #78909C; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-left: 12px; border-left: 4px solid #EE6E73; margin-top: 6px; }
        .author { font-size: 14px; color: #78909C; margin-top: 12px; font-weight: 400; display:flex; align-items:center; }
        .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; flex-shrink: 0; }
        .tag { background: #eff2f5; color: #5c6b7f; padding: 3px 9px; border-radius: 4px; font-size: 11px; font-weight: 500; }
        .summary-box { flex: 1; position: relative; overflow: hidden; min-height: 0; margin-bottom: 16px; }
        .summary { font-size: 14px; color: #546e7a; line-height: 1.7; display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden; text-align: justify; }
        .summary p { margin: 0 0 4px 0; text-indent: 2em; }
        .summary p:first-child { margin-top: 0; }
        .summary b, .summary strong { font-weight: bold; color: #455a64; }
        .summary i, .summary em { font-style: italic; }
        .summary blockquote { margin: 4px 0; padding-left: 8px; border-left: 3px solid #ccc; color: #78909C; font-size: 13px; }
        .summary blockquote p { text-indent: 0; }
        .footer { border-top: 1px solid #eee; padding-top: 14px; display: flex; justify-content: space-between; font-size: 13px; color: #78909C; margin-top: auto; flex-shrink: 0; }
        .stat { display: flex; align-items: center; gap: 4px; }
        .stat svg { width: 15px; height: 15px; }
      </style></head><body>
      <div class="card">
        <div class="cover">
            ${!displayCover ? `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.7);font-size:100px;font-family:${fontSerif};font-weight:bold;user-select:none;">${displayTitle.charAt(0).toUpperCase()}</div>` : ''}
            <div class="id-badge-container">
                <div class="id-label">ID</div>
                <div class="id-val">${info.ID}</div>
            </div>
        </div>
        <div class="info">
          <div class="header-group"><div class="title">${displayTitle}</div>${subTitle ? `<div class="subtitle">${subTitle}</div>` : ''}<div class="author">@${info.UserName}</div></div>
          <div class="tags">${tagsArr.slice(0, 10).map(t => `<span class="tag">${t}</span>`).join('')}</div>
          <div class="summary-box"><div class="summary">${summary}</div></div>
          <div class="footer">
            <span class="stat" style="color:#1e88e5">${ICONS.views}<span>${info.Views || 0}</span></span>
            <span class="stat" style="color:#5e35b1">${ICONS.comments}<span>${info.Comments || 0}</span></span>
            <span class="stat" style="color:#4caf50">${ICONS.likes}<span>${likes}</span></span>
            <span class="stat" style="color:#ffc107">${ICONS.followers}<span>${followers}</span></span>
            <span class="stat" style="color:#ff9800">${ICONS.hp}<span>${highPraise}</span></span>
            <span class="stat" style="color:#795548">${ICONS.words}<span>${wordCount}</span></span>
          </div></div></div></body></html>`

        const page = await ctx.puppeteer.page()
        try {
            await injectCookies(page, config.cookies)
            await page.setContent(html)
            await page.setViewport({ width: 660, height: 480, deviceScaleFactor: 3 })
            const img = await page.$('.card').then(e => e.screenshot({ type: 'jpeg', quality: 100 }))
            return img
        } finally {
            await page.close()
        }
    }

    const renderSearchResults = async (keyword: string, results: SearchResult[]) => {
        debugLog(`Rendering search results: ${results.length} items`)
        const html = `<!DOCTYPE html><html><head><style>
        body { margin: 0; padding: 0; font-family: ${fontStack}; width: 500px; background: transparent; }
        .container { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15); margin: 10px; }
        .header { background: #fafafa; padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
        .header-title { font-size: 16px; font-weight: bold; color: #333; }
        .list { padding: 0; }
        .item { display: flex; padding: 15px; border-bottom: 1px solid #f5f5f5; height: 110px; align-items: flex-start; }
        .cover-box { width: 75px; height: 100%; border-radius: 6px; overflow: hidden; flex-shrink: 0; margin-right: 15px; background: #eee; }
        .cover-img { width: 100%; height: 100%; object-fit: cover; }
        .content { flex: 1; display: flex; flex-direction: column; justify-content: space-between; height: 100%; min-width: 0; }
        .top-row { display: flex; justify-content: space-between; align-items: flex-start; }
        .title { font-size: 16px; font-weight: bold; color: #222; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; flex:1; margin-right: 8px;}
        .id-badge { 
            display: flex;
            border-radius: 4px;
            overflow: hidden;
            border: 1px solid #EE6E73;
            flex-shrink: 0;
            height: 18px;
        }
        .id-label {
            background: #EE6E73;
            color: #fff;
            padding: 0 4px;
            font-family: sans-serif;
            font-size: 10px;
            font-weight: bold;
            display: flex; align-items: center; justify-content: center;
            height: 100%;
            line-height: 1; margin: 0;
        }
        .id-val {
            background: #fff;
            color: #EE6E73;
            padding: 0 6px;
            font-family: "Consolas", monospace;
            font-size: 11px;
            font-weight: bold;
            display: flex; align-items: center; justify-content: center;
            height: 100%;
            line-height: 1; margin: 0;
        }
        .author { font-size: 12px; color: #78909C; }
        .tags { display: flex; gap: 4px; flex-wrap: wrap; height: 18px; overflow: hidden; margin-top: 4px; }
        .tag { background: #f3f3f3; color: #666; padding: 0 5px; border-radius: 3px; font-size: 10px; white-space: nowrap; line-height: 1.6;}
        .meta-row { display: flex; gap: 10px; font-size: 11px; color: #999; margin-top: auto; border-top: 1px dashed #eee; padding-top: 5px; }
        .stat { display: flex; align-items: center; gap: 3px; }
        .stat svg { width: 13px; height: 13px; margin-bottom: 2px;}
      </style></head><body><div class="container"><div class="header"><div class="header-title">🔍 "${keyword}"</div><div>Top ${results.length}</div></div><div class="list">
          ${results.map(r => {
            const bg = r.cover ? `<img class="cover-img" src="${r.cover}"/>` : `<div style="width:100%;height:100%;background:${generateGradient(r.title)};display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.8);font-size:36px;font-family:${fontSerif};font-weight:bold;">${r.title.charAt(0).toUpperCase()}</div>`
            return `<div class="item"><div class="cover-box">${bg}</div><div class="content">
              <div class="top-row"><div class="title">${r.title}</div>
                <div class="id-badge">
                    <div class="id-label">ID</div>
                    <div class="id-val">${r.id}</div>
                </div>
              </div>
              <div class="author">By ${r.author} ${r.status ? ` · ${r.status}` : ''}</div>
              <div class="tags">${r.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
              <div class="meta-row">
                <span class="stat" style="color:#1e88e5">${ICONS.views}<span>${r.stats.views}</span></span>
                <span class="stat" style="color:#5e35b1">${ICONS.comments}<span>${r.stats.comments}</span></span>
                <span class="stat" style="color:#4caf50">${ICONS.likes}<span>${r.stats.likes}</span></span>
                <span class="stat" style="color:#ffc107">${ICONS.followers}<span>${(r.stats as any).followers || 0}</span></span>
                <span class="stat" style="color:#795548">${ICONS.words}<span>${r.stats.words}</span></span>
                <span style="margin-left:auto;color:#757575">${r.updateTime}</span>
              </div>
            </div></div>`
        }).join('')}
        </div></div></body></html>`
        const page = await ctx.puppeteer.page()
        try {
            await page.setContent(html)
            await page.setViewport({ width: 550, height: 800, deviceScaleFactor: 3 })
            const img = await page.$('.container').then(e => e.screenshot({ type: 'jpeg', quality: 100 }))
            return img
        } finally {
            await page.close()
        }
    }

    const renderReadPages = async (info: TopicInfo) => {
        debugLog(`Rendering read pages for ${info.ID} (${info.Title})`)
        const content = cleanContent(info.Content)
        const headerHeight = 40
        const footerHeight = 30
        const paddingX = 25
        const paddingY = 20
        const lineHeightRatio = 1.6
        const contentWidth = config.deviceWidth - (paddingX * 2)
        const columnGap = 40
        const maxContentHeight = config.deviceHeight - headerHeight - footerHeight
        const lineHeightPx = config.fontSize * lineHeightRatio
        const linesPerPage = Math.floor((maxContentHeight - (paddingY * 2)) / lineHeightPx)
        const optimalContentHeight = (linesPerPage * lineHeightPx) + (paddingY * 2)
        const marginTop = Math.floor((maxContentHeight - optimalContentHeight) / 2) + headerHeight

        const html = `<!DOCTYPE html><html><head><style>
        body { margin: 0; padding: 0; width: ${config.deviceWidth}px; height: ${config.deviceHeight}px; background-color: #f6f4ec; color: #2c2c2c; font-family: ${fontSerif}; overflow: hidden; position: relative;}
        .fixed-header { position: absolute; top: 0; left: 0; width: 100%; height: ${headerHeight}px; border-bottom: 2px solid #EE6E73; box-sizing: border-box; padding: 0 12px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #EE6E73; background: #f6f4ec; z-index: 5; font-weight: bold; }
        .fixed-footer { position: absolute; bottom: 0; left: 0; width: 100%; height: ${footerHeight}px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #78909C; background: #f6f4ec; z-index: 5; }
        .fixed-header, .fixed-footer, .header-title, .header-author { text-indent: 0 !important; }

        #viewport { position: absolute; top: ${marginTop}px; left: ${paddingX}px; width: ${contentWidth}px; height: ${optimalContentHeight}px; overflow: hidden; }
        #content-scroller { height: 100%; width: 100%; column-width: ${contentWidth}px; column-gap: ${columnGap}px; column-fill: auto; padding: ${paddingY}px 0; box-sizing: border-box; font-size: ${config.fontSize}px; line-height: ${lineHeightRatio}; text-align: left; transform: translateX(0); transition: none; }
        
        p, div { margin: 0 0 0.2em 0; text-indent: 2em; word-wrap: break-word; overflow-wrap: break-word; }
        .align-center { text-align: center !important; text-align-last: center !important; text-indent: 0 !important; margin: 0.8em 0; font-weight: bold; color: #5d4037; }
        .align-right { text-align: right !important; text-indent: 0 !important; margin-top: 0.5em; color: #666; font-style: italic; }
        .no-indent { text-indent: 0 !important; }
        .header-title { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left; min-width: 0; margin-right: 10px; }
        .header-author { flex-shrink: 0; color: #78909C; max-width: 35%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right; }
        blockquote { margin: 1em 0.5em; padding-left: 1em; border-left: 4px solid #EE6E73; color: #666; }
        blockquote p { text-indent: 0; margin: 0.3em 0; }
        ul, ol { margin: 0.5em 0; padding-left: 1.5em; }
        li { margin-bottom: 0.2em; }
        hr { border: 0; height: 1px; background: #d7ccc8; margin: 1.5em 0; }
        table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.9em; }
        th, td { border: 1px solid #ccc; padding: 4px; text-align: left; }
        th { background: #eee; font-weight: bold; }
        pre { background: #eee; padding: 0.5em; overflow-x: auto; border-radius: 4px; margin: 0.5em 0; }
        code { font-family: monospace; background: #f0f0f0; padding: 2px 4px; border-radius: 3px; }
        s, strike, del { text-decoration: line-through; color: #888; }
        u { text-decoration: underline; }
        sup, sub { font-size: 0.75em; line-height: 0; position: relative; vertical-align: baseline; }
        sup { top: -0.5em; }
        sub { bottom: -0.25em; }
        a { color: #EE6E73; text-decoration: none; }
        figure.img-box { display: flex; justify-content: center; align-items: center; margin: 0.5em 0; width: 100%; }
        img { max-width: 100%; height: auto; display: block; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
        h1, h2, h3 { font-size: 1.1em; margin: 0.8em 0; color: #5d4037; text-indent: 0; font-weight: bold; text-align: center; text-align-last: center; break-after: avoid; }
        strong, b { font-weight: 900; color: #3e2723; }
        em, i { font-style: italic; }
        p:last-child { margin-bottom: 0; }
      </style></head><body>
      <div class="fixed-header">
        <div class="header-title">${info.Title}</div>
        <div class="header-author">${info.UserName}</div>
      </div>
      <div id="viewport"><div id="content-scroller">${content}</div></div>
      <div class="fixed-footer" id="page-indicator">- 1 -</div></body></html>`

        const page = await ctx.puppeteer.page()
        try {
            await injectCookies(page, config.cookies)
            await page.setContent(html)
            await page.setViewport({ width: config.deviceWidth, height: config.deviceHeight, deviceScaleFactor: 3 })

            await page.evaluate(async () => {
                await document.fonts.ready;
                await new Promise((resolve) => {
                    const imgs = Array.from(document.images);
                    if (!imgs.length) return resolve(true);
                    let loaded = 0;
                    imgs.forEach(img => {
                        if (img.complete) { loaded++; if (loaded === imgs.length) resolve(true); }
                        else { img.onload = img.onerror = () => { loaded++; if (loaded === imgs.length) resolve(true); }; }
                    });
                    setTimeout(resolve, 3000);
                });
            });

            const scrollWidth = await page.$eval('#content-scroller', el => el.scrollWidth)
            const step = contentWidth + columnGap
            const totalPages = Math.floor((scrollWidth + columnGap - 10) / step) + 1
            const finalPages = Math.max(1, totalPages)
            const imgs: Buffer[] = []
            for (let i = 0; i < finalPages; i++) {
                await page.evaluate((idx, stepPx, curr, total) => {
                    const offset = -(idx * stepPx);
                    document.getElementById('content-scroller').style.transform = `translateX(${offset}px)`;
                    document.getElementById('page-indicator').innerText = `- ${curr} / ${total} -`;
                }, i, step, i + 1, finalPages)
                imgs.push(await page.screenshot({ type: 'jpeg', quality: 100 }) as Buffer)
            }
            return imgs
        } catch (e) {
            logger.error('Error rendering read pages:', e)
            throw e
        } finally {
            await page.close()
        }
    }

    return { renderCard, renderSearchResults, renderReadPages }
}
