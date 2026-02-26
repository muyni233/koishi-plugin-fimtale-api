import crypto from 'crypto'
import { Page } from 'puppeteer-core'

export const fontStack = '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif'
export const fontSerif = '"Noto Serif SC", "Source Han Serif SC", "SimSun", serif'

export const stripHtml = (html: string | null | undefined) => {
    if (!html) return ''
    return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * 为预览卡片生成保留基本 HTML 格式的摘要
 * 保留: p, br, b, strong, i, em, blockquote
 * 移除: img, script, style, iframe, div, span, 以及其他复杂标签
 */
export const summarizeHtml = (html: string | null | undefined, maxLen: number = 250): string => {
    if (!html) return ''
    let s = html
    // 移除重元素
    s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gmi, '')
    s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gmi, '')
    s = s.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gmi, '')
    s = s.replace(/<img[^>]*\/?>/gi, '')
    s = s.replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
    // 移除页面结构元素
    s = s.replace(/<div class="right">[\s\S]*?<\/div>/i, '')
    s = s.replace(/<div class="title-tags"[\s\S]*?<\/div>/i, '')
    s = s.replace(/<p class="status-bar[\s\S]*?<\/p>/i, '')
    s = s.replace(/<div class="card-panel[\s\S]*?<\/div>/i, '')
    // div → 保留内容但去掉标签
    s = s.replace(/<\/?div[^>]*>/gi, '')
    // h1-h6 → 转为加粗段落
    s = s.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '<p><strong>$1</strong></p>')
    // 保留这些标签但清除属性: p, br, b, strong, i, em, blockquote
    s = s.replace(/<(p|br|b|strong|i|em|blockquote)(\s[^>]*)?>/gi, '<$1>')
    // 移除不需要保留的标签（span, font, a, table, ul, ol, li 等）
    s = s.replace(/<\/?(span|font|o:p|a|table|thead|tbody|tr|th|td|ul|ol|li|pre|code|s|del|strike|u|sup|sub|hr)[^>]*>/gi, '')
    // 清理
    s = s.replace(/&nbsp;/gi, ' ')
    // 移除空段落
    s = s.replace(/<p>\s*<\/p>/gi, '')
    s = s.replace(/<p>\s*(<br>)?\s*<\/p>/gi, '')
    // 整理连续空白
    s = s.replace(/(<br>\s*){3,}/gi, '<br><br>')
    s = s.replace(/\s+/g, ' ')
    s = s.trim()
    // 按纯文本长度截断，保留 HTML 结构
    const textOnly = s.replace(/<[^>]+>/g, '').trim()
    if (textOnly.length <= maxLen) return s
    // 需要截断：逐字符计数，跳过标签
    let textCount = 0
    let inTag = false
    let cutPos = s.length
    for (let i = 0; i < s.length; i++) {
        if (s[i] === '<') { inTag = true; continue }
        if (s[i] === '>') { inTag = false; continue }
        if (!inTag) {
            textCount++
            if (textCount >= maxLen) {
                cutPos = i + 1
                break
            }
        }
    }
    s = s.substring(0, cutPos)
    // 关闭未关闭的标签
    const openTags: string[] = []
    const tagRegex = /<\/?([a-z]+)[^>]*>/gi
    let m: RegExpExecArray
    while ((m = tagRegex.exec(s)) !== null) {
        const tag = m[1].toLowerCase()
        if (m[0].startsWith('</')) {
            const idx = openTags.lastIndexOf(tag)
            if (idx !== -1) openTags.splice(idx, 1)
        } else if (!m[0].endsWith('/>') && tag !== 'br') {
            openTags.push(tag)
        }
    }
    for (let i = openTags.length - 1; i >= 0; i--) {
        s += `</${openTags[i]}>`
    }
    s += '...'
    return s
}

export const extractImage = (html: string | null | undefined) => {
    if (!html) return null
    const match = html.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i)
    return match ? match[1] : null
}

export const generateGradient = (str: string) => {
    let hash = 0;
    for (let i = 0; i < (str || 'default').length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h1 = Math.abs(hash) % 360;
    const h2 = (h1 + 45) % 360;
    const s = 50 + (Math.abs(hash) % 20);
    const l1 = 60 + (Math.abs(hash >> 2) % 15);
    const l2 = 70 + (Math.abs(hash >> 3) % 15);
    return `linear-gradient(135deg, hsl(${h1}, ${s}%, ${l1}%) 0%, hsl(${h2}, ${s}%, ${l2}%) 100%)`;
}

export const cleanContent = (html: string) => {
    if (!html) return ''
    let processed = html;
    processed = processed.replace(/<div class="right">[\s\S]*?<\/div>/i, '');
    processed = processed.replace(/<div class="title-tags"[\s\S]*?<\/div>/i, '');
    processed = processed.replace(/<p class="status-bar[\s\S]*?<\/p>/i, '');
    processed = processed.replace(/<div class="card-panel[\s\S]*?<\/div>/i, '');
    processed = processed.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "");
    processed = processed.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, "");
    processed = processed.replace(/<iframe[^>]*>.*?<\/iframe>/gmi, '<p class="align-center" style="color:#78909C;font-size:0.8em;">[多媒体内容]</p>');
    processed = processed.replace(
        /<div class="material-placeholder">([\s\S]*?)<\/div>/gi,
        (match, content) => {
            const cleanImg = content.replace(/loading="lazy"/gi, '');
            return `<figure class="img-box">${cleanImg}</figure>`;
        }
    );
    processed = processed.replace(/<p[^>]*style="[^"]*text-align:\s*right[^"]*"[^>]*>/gi, '<p class="align-right">');
    processed = processed.replace(/<p[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>/gi, '<p class="align-center">');
    processed = processed.replace(/<p[^>]*style="[^"]*text-indent:\s*0[^"]*"[^>]*>/gi, '<p class="no-indent">');
    processed = processed.replace(/<\/?div[^>]*>/gi, '');
    processed = processed.replace(/<blockquote[^>]*>/gi, '<blockquote>');
    processed = processed.replace(/class=(["'])(?!(align-center|align-right|no-indent|img-box)\1)[^"']*\1/gi, '');
    processed = processed.replace(/style\s*=\s*['"][^'"]*['"]/gi, '');
    processed = processed.replace(/<\/?(span|font|o:p)[^>]*>/gi, '');
    processed = processed.replace(/&nbsp;/gi, ' ');
    processed = processed
        .replace(/<p[^>]*>\s*<\/p>/gi, '')
        .replace(/<\/p>\s*<br\s*\/?>\s*<p/gi, '</p><p>')
        .replace(/<p[^>]*>\s*(?:<br\s*\/?>|\s)+/gi, '<p>')
        .replace(/(?:<br\s*\/?>|\s)+<\/p>/gi, '</p>');
    processed = processed.replace(/ +/g, ' ');
    processed = processed.replace(/(?:<br\s*\/?>|\s)+$/gi, '');
    return processed.trim();
}

export const injectCookies = async (page: Page, cookies: string | undefined) => {
    if (!cookies) return
    const cookieList = cookies.split(';').map(pair => {
        const parts = pair.trim().split('=')
        if (parts.length < 2) return null
        return { name: parts[0].trim(), value: parts.slice(1).join('=').trim(), domain: 'fimtale.com', path: '/' }
    }).filter(c => c !== null)
    if (cookieList.length) await page.setCookie(...cookieList)
}
