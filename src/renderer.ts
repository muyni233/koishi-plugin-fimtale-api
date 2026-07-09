import fs from 'fs'
import path from 'path'
import { Context, Logger } from 'koishi'
import { TopicInfo, SearchResult } from './types'
import { Config } from './config'
import { stripHtml, summarizeHtml, extractImage, generateGradient, cleanContent, injectCookies, fontStack, fontSerif, fontBrand, fontImport } from './utils'

const ICONS = {
    views: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>',
    comments: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>',
    likes: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>',
    followers: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>',
    hp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>',
    words: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z"/></svg>',
}

export function createRenderer(ctx: Context, config: Config, logger: Logger, debugLog: (...args: any[]) => void) {
    const httpClient = config.proxy ? ctx.http.extend({ proxyAgent: config.proxy } as any) : ctx.http

    const fetchImageAsBase64 = async (url: string | undefined): Promise<string | undefined> => {
        if (!url) return undefined
        try {
            debugLog(`[Renderer] Inlining image: ${url}`)
            const response = await httpClient.get(url, { responseType: 'arraybuffer' })
            const buffer = Buffer.from(response)
            let mime = 'image/jpeg'
            if (url.toLowerCase().endsWith('.png')) mime = 'image/png'
            else if (url.toLowerCase().endsWith('.gif')) mime = 'image/gif'
            else if (url.toLowerCase().endsWith('.webp')) mime = 'image/webp'
            return `data:${mime};base64,${buffer.toString('base64')}`
        } catch (e) {
            debugLog(`[Renderer] Failed to inline image ${url}: ${e.message}`)
            return url
        }
    }

    const renderCard = async (info: TopicInfo, parent?: TopicInfo) => {
        debugLog(`Rendering Card for ID: ${info.ID}`)
        
        // Read logo and encode as base64
        let base64Logo = ''
        try {
            const logoPath = path.resolve(__dirname, '../res/icon2.webp')
            if (fs.existsSync(logoPath)) {
                const logoBuffer = fs.readFileSync(logoPath)
                base64Logo = `data:image/webp;base64,${logoBuffer.toString('base64')}`
            }
        } catch (e) {
            logger.error('Failed to read logo icon2.webp:', e)
        }

        const isChapter = info.IsChapter || (!!parent && parent.ID !== info.ID)
        const displayTitle = isChapter && parent ? parent.Title : info.Title

        let displayCover = info.Background || extractImage(info.Content)

        if (!displayCover && parent) {
            displayCover = parent.Background
            if (!displayCover && parent.Content) displayCover = extractImage(parent.Content)
        }

        const displayTagsObj = isChapter && parent ? parent.Tags : info.Tags
        const subTitle = isChapter ? info.Title : null
        
        let summary = summarizeHtml(info.Intro) || summarizeHtml(info.Content)
        if (stripHtml(summary).length < 10 && parent && isChapter) {
            summary = summarizeHtml(parent.Intro) || summarizeHtml(parent.Content)
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

        // 画册检测：根据标签检测
        const isAlbum = tagsArr.includes('图') || tagsArr.includes('漫画') || tagsArr.includes('画册') || tagsArr.includes('图楼') || tagsArr.includes('漫画或画册')

        // 从当前页面内容提取图片（不是 parent）
        const currentImgMatches = (info.Content || '').match(/<img[^>]+src\s*=\s*["']([^"']+)["']/gi) || []
        const currentImgs = currentImgMatches.map(tag => {
            const m = tag.match(/src\s*=\s*["']([^"']+)["']/i)
            return m ? m[1] : ''
        }).filter(Boolean)
        const hasImages = currentImgs.length > 0
        const albumImgs = currentImgs.slice(0, 2)

        // Convert images to base64 using proxy client
        const [base64Cover, base64Avatar, base64AlbumImgs] = await Promise.all([
            displayCover ? fetchImageAsBase64(displayCover) : Promise.resolve(undefined),
            info.UserAvatar ? fetchImageAsBase64(info.UserAvatar) : Promise.resolve(undefined),
            isAlbum && hasImages ? Promise.all(albumImgs.map(src => fetchImageAsBase64(src))) : Promise.resolve([])
        ])

        const bgStyle = base64Cover
            ? `background: url('${base64Cover}') center/cover no-repeat, ${generateGradient(displayTitle)};`
            : `background: ${generateGradient(displayTitle)};`

        // Calculate a matching dark brand color based on the title hash
        let hash = 0;
        for (let i = 0; i < (displayTitle || 'default').length; i++) {
            hash = displayTitle.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h1 = Math.abs(hash) % 360;
        const s1 = 15 + (Math.abs(hash) % 15);
        const darkBgColor = `hsl(${h1}, ${s1}%, 11%)`;

        const wordStatColor = isAlbum ? '#ffe066' : '#ced4da'
        const splitWordStatColor = isAlbum ? '#e67e22' : '#8f7970'
        const wordStatIcon = isAlbum ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>' : ICONS.words
        const wordStatText = isAlbum ? `${wordCount} P` : `${wordCount} 字`

        const actualCardStyle = (config.cardStyle === 'overlay' && base64Cover) ? 'overlay' : 'split'
        let html = ''
        if (actualCardStyle === 'overlay') {
            const cardBgStyle = `background: url('${base64Cover}') center/cover no-repeat;`
            html = `<!DOCTYPE html><html><head><style>
                ${fontImport}
                body { margin: 0; padding: 0; font-family: ${fontStack}; background: transparent; }
                .card { width: 620px; min-height: 250px; border-radius: 22px; box-shadow: 0 24px 64px rgba(0,0,0,0.35), 0 8px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.04); display: flex; flex-direction: column; overflow: hidden; position: relative; }
                .card.landscape-cover { height: auto !important; min-height: unset !important; background: ${darkBgColor} !important; gap: 0; }
                .card.landscape-cover .cover-image-wrapper { position: relative; width: 620px; height: auto; aspect-ratio: var(--cover-ratio); z-index: 0; overflow: hidden; border-bottom: 1px solid rgba(255,255,255,0.06); }
                .card.landscape-cover .cover-image { width: 100%; height: 100%; object-fit: cover; }
                .card.landscape-cover .container { padding: 24px 32px 28px 32px; background: transparent !important; }
                .card.landscape-cover .info-wrapper { background: transparent !important; padding: 0 !important; }
                .cover-image-wrapper { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
                .cover-image { width: 100%; height: 100%; object-fit: cover; }
                .mask { position: absolute; top: 0; left: 0; right: 0; height: 80px; z-index: 1; pointer-events: none; background: linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.12) 40%, rgba(0,0,0,0) 100%); }
                .card.landscape-cover .mask { display: none; }
                .noise { position: absolute; inset: 0; z-index: 2; pointer-events: none; opacity: 0.04; mix-blend-mode: overlay; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); background-repeat: repeat; background-size: 128px 128px; }
                .container { position: relative; z-index: 3; display: flex; flex-direction: column; justify-content: flex-end; box-sizing: border-box; flex: 1; color: #fff; }
                .info-wrapper { display: flex; flex-direction: column; width: 100%; padding: 60px 32px 28px 32px; box-sizing: border-box; background: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 20%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.75) 100%); }
                #top-row { position: absolute; top: 28px; left: 32px; right: 32px; z-index: 10; display: flex; justify-content: space-between; align-items: center; }
                .brand-wrap { display: flex; align-items: center; gap: 8px; }
                .logo { width: 34px; height: 34px; object-fit: contain; margin-left: -3px; }
                .brand-name { font-family: ${fontBrand}; font-size: 18px; font-weight: 800; letter-spacing: 0.5px; color: rgba(255,255,255,0.95); text-shadow: 0 2px 6px rgba(0,0,0,0.35); }
                .header-connector { flex: 1; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.18); font-size: 8px; letter-spacing: 5px; text-indent: 5px; margin: 0 16px; user-select: none; pointer-events: none; }
                .header-connector::before { content: ""; flex: 1; height: 1px; background: linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.14)); margin-right: 12px; }
                .header-connector::after { content: " "; flex: 1; height: 1px; background: linear-gradient(to right, rgba(255,255,255,0.14), rgba(255,255,255,0)); margin-left: 12px; }
                .id-text-wrap { display: flex; align-items: center; gap: 4px; }
                .id-hash { font-family: ${fontBrand}; font-size: 22px; font-weight: 800; color: #EE6E73; text-shadow: 0 2px 6px rgba(0,0,0,0.35); }
                .id-num { font-family: ${fontBrand}; font-size: 18px; font-weight: 800; color: rgba(255,255,255,0.95); text-shadow: 0 2px 6px rgba(0,0,0,0.35); }
                .info-block { display: flex; flex-direction: column; flex-grow: 1; justify-content: flex-end; margin-bottom: 12px; }
                .title { font-size: 26px; font-weight: 800; line-height: 1.35; color: #ffffff; margin: -4px -10px 2px -10px; padding: 4px 10px 8px 10px; text-shadow: 0 2px 8px rgba(0,0,0,0.45); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; letter-spacing: -0.3px; }
                .subtitle { font-size: 16px; color: rgba(255, 255, 255, 0.85); font-weight: 500; margin: 4px -8px 4px 0; padding: 0 8px 6px 12px; border-left: 4px solid #EE6E73; text-shadow: 0 2px 6px rgba(0,0,0,0.35); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .author-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.9); text-shadow: 0 1px 4px rgba(0,0,0,0.25); }
                .author-avatar { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid rgba(255, 255, 255, 0.6); object-fit: cover; }
                .tags-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
                .tag-pill { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.85); padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
                .summary-box { font-size: 14px; line-height: 1.65; color: rgba(255, 255, 255, 0.82); text-align: left; overflow: hidden; text-shadow: 0 1px 3px rgba(0,0,0,0.2); padding: 2px 8px 6px 8px; margin: 0 -8px 6px -8px; }
                .summary-box .summary { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; max-height: 7.2em; }
                .summary-box p { margin: 0; text-indent: 2em; }
                .album-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; width: 100%; }
                .divider { height: 1px; background: linear-gradient(to right, transparent, rgba(255,255,255,0.2) 15%, rgba(255,255,255,0.2) 85%, transparent); margin-bottom: 14px; }
                .footer-wrap { background: rgba(0,0,0,0.12); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-radius: 12px; padding: 10px 16px; border: 1px solid rgba(255,255,255,0.06); max-width: 480px; margin: 0 auto; width: 100%; box-sizing: border-box; }
                .footer { display: flex; justify-content: space-between; font-size: 13px; color: rgba(255,255,255,0.8); }
                .stat { display: flex; align-items: center; gap: 4px; font-weight: 600; }
                .stat svg { width: 16px; height: 16px; fill: currentColor; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.4)); }
                .corner-tl, .corner-br { position: absolute; width: 24px; height: 24px; z-index: 10; pointer-events: none; }
                .corner-tl { top: 16px; left: 20px; border-top: 1.5px solid rgba(255,255,255,0.12); border-left: 1.5px solid rgba(255,255,255,0.12); }
                .corner-br { bottom: 16px; right: 20px; border-bottom: 1.5px solid rgba(255,255,255,0.12); border-right: 1.5px solid rgba(255,255,255,0.12); }
                </style></head><body>
                <div class="card" style="--cover-url: url('${base64Cover}'); ${cardBgStyle}">
                    <div class="corner-tl"></div>
                    <div class="corner-br"></div>
                    <div class="cover-image-wrapper"><img class="cover-image" src="${base64Cover}" /></div>
                    <div class="mask"></div>
                    <div class="noise"></div>
                    <div id="top-row">
                        <div class="brand-wrap">
                            ${base64Logo ? `<img class="logo" src="${base64Logo}" />` : ''}
                            <span class="brand-name">FimTale</span>
                        </div>
                        <div class="header-connector">✦✦✦</div>
                        <div class="id-text-wrap">
                            <span class="id-hash">#</span>
                            <span class="id-num">${info.ID}</span>
                        </div>
                    </div>
                    <div class="container">
                        <div class="info-wrapper">
                            <div class="info-block">
                                <div class="title">${displayTitle}</div>
                                ${subTitle ? `<div class="subtitle">${subTitle}</div>` : ''}
                                <div class="author-row">
                                    ${base64Avatar ? `<img class="author-avatar" src="${base64Avatar}"/>` : ''}
                                    <span>@${info.UserName}</span>
                                </div>
                                <div class="tags-row">
                                    ${tagsArr.slice(0, 8).map(t => `<span class="tag-pill">${t}</span>`).join('')}
                                </div>
                                <div class="summary-box">
                                    ${isAlbum && hasImages ? `<div class="album-grid" style="height: 130px; margin-bottom: 6px;">${(base64AlbumImgs as string[]).map(src => `<img src="${src}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;"/>`).join('')}</div><div style="font-size:12px; color:rgba(255,255,255,0.7);">🖼️ 当前章节包含 ${currentImgs.length} 幅图</div>` : `<div class="summary">${summary}</div>`}
                                </div>
                            </div>

                            <div class="divider"></div>

                            <div class="footer-wrap">
                                <div class="footer">
                                    <span class="stat" style="color:#a5d8ff">${ICONS.views}<span>${info.Views || 0}</span></span>
                                    <span class="stat" style="color:#d0bfff">${ICONS.comments}<span>${info.Comments || 0}</span></span>
                                    <span class="stat" style="color:#b2f2bb">${ICONS.likes}<span>${likes}</span></span>
                                    <span class="stat" style="color:#ffc9c9">${ICONS.followers}<span>${followers}</span></span>
                                    <span class="stat" style="color:#ffec99">${ICONS.hp}<span>${highPraise}</span></span>
                                    <span class="stat" style="color:${wordStatColor}">${wordStatIcon}<span>${wordStatText}</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <img id="raw-cover" src="${base64Cover}" style="display: none;" />
                </div>
                </body></html>`
        } else {
            // Split style (original)
            html = `<!DOCTYPE html><html><head><style>
            ${fontImport}
            body { margin: 0; padding: 0; font-family: ${fontStack}; background: transparent; }
            .card { width: 620px; min-height: 420px; background: #fff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); display: flex; overflow: hidden; }
            .cover { width: 220px; min-height: 100%; ${bgStyle} background-size: cover; background-position: center; position: relative; flex-shrink: 0; }
            .id-badge-container {
                position: absolute; top: 15px; left: 15px;
                display: flex;
                border-radius: 6px;
                overflow: hidden;
                height: 24px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                transform: translateZ(0);
                -webkit-mask-image: -webkit-radial-gradient(white, black);
            }
            .id-label {
                background: linear-gradient(135deg, rgba(238,110,115,0.95), rgba(232,93,98,0.95));
                color: #fff;
                padding: 0 6px;
                font-family: ${fontBrand};
                font-size: 11.5px;
                font-weight: 800;
                display: flex; align-items: center; justify-content: center;
                height: 100%;
                line-height: 1; margin: 0;
            }
            .id-val {
                background: rgba(255,255,255,0.55);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                color: rgba(238,110,115,0.95);
                padding: 0 8px;
                font-family: ${fontBrand};
                font-size: 11.5px;
                font-weight: 800;
                display: flex; align-items: center; justify-content: center;
                height: 100%;
                line-height: 1; margin: 0;
            }
            .info { flex: 1; padding: 26px; display: flex; flex-direction: column; overflow: hidden; position: relative; }
            .header-group { flex-shrink: 0; margin-bottom: 16px; border-bottom: 2px solid #f5f5f5; padding-bottom: 12px; }
            .title { font-size: 24px; font-weight: 700; color: #333; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 6px; }
            .subtitle { font-size: 16px; color: #78909C; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-left: 12px; border-left: 4px solid #EE6E73; margin-top: 6px; }
            .author { font-size: 14px; color: #78909C; margin-top: 12px; font-weight: 400; display:flex; align-items:center; gap: 6px; }
            .author-avatar { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
            .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; flex-shrink: 0; }
            .tag { background: #eff2f5; color: #5c6b7f; padding: 3px 9px; border-radius: 4px; font-size: 11px; font-weight: 500; }
            .summary-box { flex: 1; position: relative; overflow: hidden; min-height: 0; margin-bottom: 16px; }
            .summary { font-size: 14px; color: #546e7a; line-height: 1.7; display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden; text-align: left; max-height: 11.0em; }
            .summary p { margin: 0 0 4px 0; text-indent: 2em; }
            .summary p:first-child { margin-top: 0; }
            .summary b, .summary strong { font-weight: bold; color: #455a64; }
            .summary i, .summary em { font-style: italic; }
            .summary blockquote { margin: 4px 0; padding-left: 8px; border-left: 3px solid #ccc; color: #78909C; font-size: 13px; }
            .summary blockquote p { text-indent: 0; }
            .album-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; width: 100%; height: 100%; }
            .album-grid img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }
            .album-label { font-size: 12px; color: #78909C; margin-top: 6px; text-align: center; }
            .footer { border-top: 1px solid #eee; padding-top: 14px; display: flex; justify-content: space-between; font-size: 13px; color: #78909C; margin-top: auto; flex-shrink: 0; }
            .stat { display: flex; align-items: center; gap: 4px; }
            .stat svg { width: 15px; height: 15px; }
            </style></head><body>
            <div class="card">
                <div class="cover">
                    ${!base64Cover ? `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.9);font-size:110px;font-family:'Segoe UI', system-ui, sans-serif;font-weight:800;letter-spacing:-2px;user-select:none;text-shadow:0 4px 15px rgba(0,0,0,0.15);">${(displayTitle.match(/[\w\u4e00-\u9fa5]/)?.[0] || displayTitle.charAt(0)).toUpperCase()}</div>` : ''}
                    <div class="id-badge-container">
                        <div class="id-label">#</div>
                        <div class="id-val">${info.ID}</div>
                    </div>
                </div>
                <div class="info">
                  <div class="header-group"><div class="title">${displayTitle}</div>${subTitle ? `<div class="subtitle">${subTitle}</div>` : ''}<div class="author">${base64Avatar ? `<img class="author-avatar" src="${base64Avatar}"/>` : ''}@${info.UserName}</div></div>
                  <div class="tags">${tagsArr.slice(0, 10).map(t => `<span class="tag">${t}</span>`).join('')}</div>
                  <div class="summary-box">${isAlbum && hasImages ? `<div class="album-grid">${(base64AlbumImgs as string[]).map(src => `<img src="${src}"/>`).join('')}</div><div class="album-label">🖼️ 当前章节包含 ${currentImgs.length} 幅图</div>` : `<div class="summary">${summary}</div>`}</div>
                  <div class="footer">
                    <span class="stat" style="color:#6ea2d5">${ICONS.views}<span>${info.Views || 0}</span></span>
                    <span class="stat" style="color:#8b6bb5">${ICONS.comments}<span>${info.Comments || 0}</span></span>
                    <span class="stat" style="color:#72ae76">${ICONS.likes}<span>${likes}</span></span>
                    <span class="stat" style="color:#5c9ec8">${ICONS.followers}<span>${followers}</span></span>
                    <span class="stat" style="color:#d4a24d">${ICONS.hp}<span>${highPraise}</span></span>
                    <span class="stat" style="color:${splitWordStatColor}">${wordStatIcon}<span>${wordStatText}</span></span>
                  </div></div></div></body></html>`
        }

        const page = await ctx.puppeteer.page()
        try {
            await injectCookies(page, config.cookies)
            await page.setContent(html)

            if (actualCardStyle === 'overlay') {
                await page.evaluate(`(async () => {
                    await document.fonts.ready;
                    const img = document.getElementById('raw-cover');
                    
                    const adjustLayout = (image) => {
                        const ratio = image.naturalWidth / image.naturalHeight;
                        const card = document.querySelector('.card');
                        if (!card) return;
                        
                        // Measure content height dynamically
                        const topRow = document.getElementById('top-row');
                        const infoBlock = document.querySelector('.info-block');
                        const divider = document.querySelector('.divider');
                        const footerWrap = document.querySelector('.footer-wrap');
                        
                        const topRowHeight = topRow ? topRow.offsetHeight : 0;
                        const infoBlockHeight = infoBlock ? infoBlock.offsetHeight : 0;
                        const dividerHeight = divider ? divider.offsetHeight : 0;
                        const footerHeight = footerWrap ? footerWrap.offsetHeight : 0;
                        
                        const minTextHeight = 28 + Math.max(topRowHeight + 16, 0) + infoBlockHeight + 14 + dividerHeight + 14 + footerHeight + 32;
                        const scaledImageHeight = 620 / ratio;
                        
                        if (isFinite(ratio) && ratio > 1.0 && scaledImageHeight < minTextHeight) {
                            card.classList.add('landscape-cover');
                            card.style.setProperty('--cover-ratio', ratio.toString());
                        } else {
                            const cleanRatio = (isFinite(ratio) && ratio > 0) ? ratio : 0.75;
                            const targetHeight = 620 / cleanRatio;
                            const finalHeight = Math.max(minTextHeight, Math.min(960, targetHeight));
                            card.style.height = finalHeight + 'px';
                        }
                    };

                    if (img) {
                        if (img.complete) {
                            adjustLayout(img);
                        } else {
                            await new Promise((resolve) => {
                                img.onload = () => {
                                    adjustLayout(img);
                                    resolve(true);
                                };
                                img.onerror = () => resolve(true);
                                setTimeout(resolve, 2000);
                            });
                        }
                    } else {
                        const card = document.querySelector('.card');
                        if (card) card.style.height = '750px';
                    }
                })()`);
            }

            const viewportHeight = actualCardStyle === 'overlay' ? 1100 : 480;
            await page.setViewport({ width: 660, height: viewportHeight, deviceScaleFactor: 3 })
            const img = await page.$('.card').then(e => e.screenshot({ type: 'jpeg', quality: 100 }))
            return img
        } finally {
            await page.close()
        }
    }

    const renderSearchResults = async (keyword: string, results: SearchResult[]) => {
        debugLog(`Rendering search results: ${results.length} items`)

        // Convert all search result covers and avatars to base64 using proxy client
        const inlinedResults = await Promise.all(results.map(async (r) => {
            const cover = r.cover ? await fetchImageAsBase64(r.cover) : undefined
            const authorAvatar = r.authorAvatar ? await fetchImageAsBase64(r.authorAvatar) : undefined
            return {
                ...r,
                cover,
                authorAvatar
            }
        }))
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
            font-family: ${fontBrand};
            font-size: 11px;
            font-weight: bold;
            display: flex; align-items: center; justify-content: center;
            height: 100%;
            line-height: 1; margin: 0;
        }
        .id-val {
            background: #fff;
            color: #EE6E73;
            padding: 0 6px;
            font-family: ${fontBrand};
            font-size: 11px;
            font-weight: bold;
            display: flex; align-items: center; justify-content: center;
            height: 100%;
            line-height: 1; margin: 0;
        }
        .author { font-size: 12px; color: #78909C; display: flex; align-items: center; gap: 4px; }
        .author-avatar { width: 16px; height: 16px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .tags { display: flex; gap: 4px; flex-wrap: wrap; height: 18px; overflow: hidden; margin-top: 4px; }
        .tag { background: #f3f3f3; color: #666; padding: 0 5px; border-radius: 3px; font-size: 10px; white-space: nowrap; line-height: 1.6;}
        .meta-row { display: flex; gap: 10px; font-size: 11px; color: #999; margin-top: auto; border-top: 1px dashed #eee; padding-top: 5px; }
        .stat { display: flex; align-items: center; gap: 3px; }
        .stat svg { width: 13px; height: 13px; margin-bottom: 2px;}
        .type-badge { display: inline-block; padding: 0 4px; border-radius: 3px; font-size: 9px; font-weight: bold; color: #fff; margin-right: 4px; line-height: 16px; vertical-align: middle; }
        .type-badge.tb-pic { background: #FFA726; }
        .type-badge.tb-repost { background: #42A5F5; }
        .type-badge.tb-long { background: #5C6BC0; }
        .type-badge.tb-t { background: #FF7043; }
      </style></head><body><div class="container"><div class="header"><div class="header-title">🔍 "${keyword}"</div><div>Top ${results.length}</div></div><div class="list">
          ${inlinedResults.map(r => {
            // 类型徽章：图/转/长/T
            const typeBadges: string[] = []
            if (r.tags.includes('图')) typeBadges.push('<span class="type-badge tb-pic">🖼️ 图</span>')
            if (r.tags.includes('转')) typeBadges.push('<span class="type-badge tb-repost">转</span>')
            if (r.tags.includes('长')) typeBadges.push('<span class="type-badge tb-long">长</span>')
            if (r.tags.includes('T')) typeBadges.push('<span class="type-badge tb-t">T</span>')
            // 过滤掉已经展示为徽章的类型标签
            const displayTags = r.tags.filter(t => !['图', '转', '长', 'T'].includes(t))
            const wordsIcon = r.stats.words.includes('P') ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>' : ICONS.words
            const bg = r.cover ? `<img class="cover-img" src="${r.cover}"/>` : `<div style="width:100%;height:100%;background:${generateGradient(r.title)};display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.95);font-size:38px;font-family:'Segoe UI', system-ui, sans-serif;font-weight:800;letter-spacing:-1px;text-shadow:0 2px 8px rgba(0,0,0,0.1);">${(r.title.match(/[\w\u4e00-\u9fa5]/)?.[0] || r.title.charAt(0)).toUpperCase()}</div>`
            return `<div class="item"><div class="cover-box">${bg}</div><div class="content">
              <div class="top-row"><div class="title">${r.title}</div>
                <div class="id-badge">
                    <div class="id-label">#</div>
                    <div class="id-val">${r.id}</div>
                </div>
              </div>
              <div class="author">${r.authorAvatar ? `<img class="author-avatar" src="${r.authorAvatar}"/>` : ''}${typeBadges.join('')}${r.author} ${r.status ? ` · ${r.status}` : ''}</div>
              <div class="tags">${displayTags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
              <div class="meta-row">
                <span class="stat" style="color:#6ea2d5">${ICONS.views}<span>${r.stats.views}</span></span>
                <span class="stat" style="color:#8b6bb5">${ICONS.comments}<span>${r.stats.comments}</span></span>
                <span class="stat" style="color:#72ae76">${ICONS.likes}<span>${r.stats.likes}</span></span>
                <span class="stat" style="color:#d4a24d">${ICONS.hp}<span>${(r.stats as any).followers || 0}</span></span>
                <span class="stat" style="color:#8f7970">${wordsIcon}<span>${r.stats.words}</span></span>
                <span style="margin-left:auto;color:#a0aab0;">${r.updateTime}</span>
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
        const tagsArr: string[] = []
        if (info.Tags?.Type) tagsArr.push(info.Tags.Type)
        if (info.Tags?.OtherTags) tagsArr.push(...info.Tags.OtherTags)
        const isAlbum = tagsArr.includes('图') || tagsArr.includes('漫画') || tagsArr.includes('画册') || tagsArr.includes('图楼') || tagsArr.includes('漫画或画册')

        let rawContent = info.Content || ''
        let extraImages: string[] = []

        if (isAlbum) {
            const imgMatches = rawContent.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/gi) || []
            extraImages = imgMatches.map(tag => {
                const m = tag.match(/src\s*=\s*["']([^"']+)["']/i)
                return m ? m[1] : ''
            }).filter(Boolean)

            // 去除画册的所有图片，剩余部分当作纯文本渲染
            rawContent = rawContent.replace(/<img[^>]*>/gi, '')
            rawContent = rawContent.replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
        }

        const content = cleanContent(rawContent)

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
        .fixed-header { position: absolute; top: 0; left: 0; width: 100%; height: ${headerHeight}px; border-bottom: 1.5px solid #EE6E73; box-sizing: border-box; padding: 0 16px; display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #EE6E73; background: #f6f4ec; z-index: 5; font-weight: 500; letter-spacing: 0.5px; }
        .fixed-footer { position: absolute; bottom: 0; left: 0; width: 100%; height: ${footerHeight}px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #a0978a; background: #f6f4ec; z-index: 5; letter-spacing: 1px; }
        .fixed-header, .fixed-footer, .header-title, .header-author { text-indent: 0 !important; }

        #viewport { position: absolute; top: ${marginTop}px; left: ${paddingX}px; width: ${contentWidth}px; height: ${optimalContentHeight}px; overflow: hidden; }
        #content-scroller { height: 100%; width: 100%; column-width: ${contentWidth}px; column-gap: ${columnGap}px; column-fill: auto; padding: ${paddingY}px 0; box-sizing: border-box; font-size: ${config.fontSize}px; line-height: ${lineHeightRatio}; text-align: justify; text-align-last: left; transform: translateX(0); transition: none; }
        
        p, div { margin: 0 0 0.5em 0; text-indent: 2em; word-wrap: break-word; overflow-wrap: break-word; word-break: break-all; }
        .align-left { text-align: left !important; text-align-last: left !important; text-indent: 0 !important; }
        .align-center { text-align: center !important; text-align-last: center !important; text-indent: 0 !important; margin: 1em 0; font-weight: bold; color: #5d4037; }
        .align-right { text-align: right !important; text-align-last: right !important; text-indent: 0 !important; margin-top: 0.5em; color: #888; font-style: italic; }
        .no-indent { text-indent: 0 !important; }
        .header-title { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left; min-width: 0; margin-right: 10px; }
        .header-author { flex-shrink: 0; color: #b0a090; max-width: 35%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right; }
        blockquote { margin: 0.8em 0; padding: 0.5em 1em; border-left: 3px solid #EE6E73; background: rgba(238,110,115,0.04); border-radius: 0 4px 4px 0; color: #6d5e4e; }
        blockquote p { text-indent: 0; margin: 0.3em 0; }
        ul, ol { margin: 0.5em 0; padding-left: 1.5em; }
        li { margin-bottom: 0.3em; }
        hr { border: none; height: auto; background: none; margin: 1.5em 0; text-align: center; text-align-last: center; text-indent: 0; }
        hr::after { content: "✦  ✦  ✦"; color: #EE6E73; font-size: 12px; letter-spacing: 4px; }
        table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.9em; }
        th, td { border: 1px solid #d7ccc8; padding: 6px 8px; text-align: left; }
        th { background: #ede8df; font-weight: bold; color: #5d4037; }
        pre { background: #ede8df; padding: 0.6em; overflow-x: auto; border-radius: 4px; margin: 0.5em 0; font-size: 0.85em; }
        code { font-family: 'Consolas', monospace; background: #ede8df; padding: 2px 4px; border-radius: 3px; font-size: 0.9em; }
        s, strike, del { text-decoration: line-through; color: #999; }
        u { text-decoration: underline; text-decoration-color: #EE6E73; }
        sup, sub { font-size: 0.75em; line-height: 0; position: relative; vertical-align: baseline; }
        sup { top: -0.5em; }
        sub { bottom: -0.25em; }
        a { color: #EE6E73; text-decoration: none; }
        figure.img-box { display: flex; justify-content: center; align-items: center; margin: 0.8em 0; width: 100%; }
        img { max-width: 100%; height: auto; display: block; border-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        h1, h2, h3 { font-size: 1.1em; margin: 1em 0 0.5em; color: #5d4037; text-indent: 0; font-weight: bold; text-align: center; text-align-last: center; break-after: avoid; }
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

            // 如果提取完图片后，只剩下了空白或无意义标签，就不渲染这第一页空气
            const strippedText = stripHtml(content);
            if (!isAlbum || strippedText.length > 5) {
                for (let i = 0; i < finalPages; i++) {
                    await page.evaluate((idx, stepPx, curr, total) => {
                        const offset = -(idx * stepPx);
                        document.getElementById('content-scroller').style.transform = `translateX(${offset}px)`;
                        const pct = Math.round((curr / total) * 100);
                        document.getElementById('page-indicator').innerText = `— ${curr} / ${total} —   ${pct}%`;
                    }, i, step, i + 1, finalPages)
                    imgs.push(await page.screenshot({ type: 'jpeg', quality: 100 }) as Buffer)
                }
            }

            return { pages: imgs, extraImages }
        } catch (e) {
            logger.error('Error rendering read pages:', e)
            throw e
        } finally {
            await page.close()
        }
    }

    return { renderCard, renderSearchResults, renderReadPages }
}
