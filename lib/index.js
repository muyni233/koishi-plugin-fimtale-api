var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var import_crypto = __toESM(require("crypto"));
var name = "fimtale-watcher";
var inject = ["puppeteer", "database", "http"];
var Config = import_koishi.Schema.object({
  apiUrl: import_koishi.Schema.string().default("https://fimtale.com/api/v1").description("Fimtale API 基础路径"),
  apiKey: import_koishi.Schema.string().role("secret").required().description("API Key (必填)"),
  apiPass: import_koishi.Schema.string().role("secret").required().description("API Pass (必填)"),
  cookies: import_koishi.Schema.string().role("secret").description("浏览器 Cookie (用于解除安全模式，必填)"),
  pollInterval: import_koishi.Schema.number().default(60 * 1e3).description("追更轮询间隔(ms)"),
  autoParseLink: import_koishi.Schema.boolean().default(true).description("自动解析链接为预览卡片"),
  deviceWidth: import_koishi.Schema.number().default(390).description("阅读器渲染宽度(px)"),
  deviceHeight: import_koishi.Schema.number().default(844).description("阅读器渲染高度(px)"),
  fontSize: import_koishi.Schema.number().default(20).description("正文字号(px)")
});
function apply(ctx, config) {
  ctx.model.extend("fimtale_subs", {
    id: "unsigned",
    cid: "string",
    threadId: "string",
    lastCount: "integer",
    lastCheck: "integer"
  }, { primary: "id", autoInc: true });
  const sleep = /* @__PURE__ */ __name((ms) => new Promise((resolve) => setTimeout(resolve, ms)), "sleep");
  const stripHtml = /* @__PURE__ */ __name((html) => {
    if (!html) return "";
    return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  }, "stripHtml");
  const extractImage = /* @__PURE__ */ __name((html) => {
    if (!html) return null;
    const match = html.match(/<img[^>]+src="([^">]+)"/);
    return match ? match[1] : null;
  }, "extractImage");
  const generateGradient = /* @__PURE__ */ __name((str) => {
    const hash = import_crypto.default.createHash("md5").update(str || "default").digest("hex");
    const c1 = "#" + hash.substring(0, 6);
    const c2 = "#" + hash.substring(6, 12);
    return `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
  }, "generateGradient");
  const cleanContent = /* @__PURE__ */ __name((html) => {
    if (!html) return "";
    let processed = html;
    processed = processed.replace(/<div class="right">[\s\S]*?<\/div>/i, "");
    processed = processed.replace(/<div class="title-tags"[\s\S]*?<\/div>/i, "");
    processed = processed.replace(/<p class="status-bar[\s\S]*?<\/p>/i, "");
    processed = processed.replace(/<div class="card-panel[\s\S]*?<\/div>/i, "");
    processed = processed.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "");
    processed = processed.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, "");
    processed = processed.replace(/<iframe[^>]*>.*?<\/iframe>/gmi, '<p class="align-center" style="color:#999;font-size:0.8em;">[多媒体内容]</p>');
    processed = processed.replace(
      /<div class="material-placeholder">([\s\S]*?)<\/div>/gi,
      (match, content) => {
        const cleanImg = content.replace(/loading="lazy"/gi, "");
        return `<figure class="img-box">${cleanImg}</figure>`;
      }
    );
    processed = processed.replace(/<p[^>]*style="[^"]*text-align:\s*right[^"]*"[^>]*>/gi, '<p class="align-right">');
    processed = processed.replace(/<p[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>/gi, '<p class="align-center">');
    processed = processed.replace(/<p[^>]*style="[^"]*text-indent:\s*0[^"]*"[^>]*>/gi, '<p class="no-indent">');
    processed = processed.replace(/<\/?div[^>]*>/gi, "");
    processed = processed.replace(/<blockquote[^>]*>/gi, "<blockquote>");
    processed = processed.replace(/class=(["'])(?!(align-center|align-right|no-indent|img-box)\1)[^"']*\1/gi, "");
    processed = processed.replace(/style\s*=\s*['"][^'"]*['"]/gi, "");
    processed = processed.replace(/<\/?(span|font|o:p)[^>]*>/gi, "");
    processed = processed.replace(/&nbsp;/gi, " ");
    processed = processed.replace(/<p[^>]*>\s*<\/p>/gi, "").replace(/<\/p>\s*<br\s*\/?>\s*<p/gi, "</p><p>").replace(/<p[^>]*>\s*(?:<br\s*\/?>|\s)+/gi, "<p>").replace(/(?:<br\s*\/?>|\s)+<\/p>/gi, "</p>");
    processed = processed.replace(/ +/g, " ");
    processed = processed.replace(/(?:<br\s*\/?>|\s)+$/gi, "");
    return processed.trim();
  }, "cleanContent");
  const fontStack = '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif';
  const fontSerif = '"Noto Serif SC", "Source Han Serif SC", "SimSun", serif';
  const injectCookies = /* @__PURE__ */ __name(async (page) => {
    if (!config.cookies) return;
    const cookies = config.cookies.split(";").map((pair) => {
      const parts = pair.trim().split("=");
      if (parts.length < 2) return null;
      return { name: parts[0].trim(), value: parts.slice(1).join("=").trim(), domain: "fimtale.com", path: "/" };
    }).filter((c) => c !== null);
    if (cookies.length) await page.setCookie(...cookies);
  }, "injectCookies");
  const fetchThread = /* @__PURE__ */ __name(async (threadId) => {
    try {
      const url = `${config.apiUrl}/t/${threadId}`;
      const params = { APIKey: config.apiKey, APIPass: config.apiPass };
      const res = await ctx.http.get(url, { params });
      if (res.Status !== 1 || !res.TopicInfo) return { valid: false, msg: res.ErrorMessage || "API Error" };
      return { valid: true, data: res.TopicInfo, parent: res.ParentInfo, menu: res.Menu || [] };
    } catch (e) {
      return { valid: false, msg: "Request Failed" };
    }
  }, "fetchThread");
  const fetchRandomId = /* @__PURE__ */ __name(async () => {
    try {
      const headers = config.cookies ? { Cookie: config.cookies } : {};
      const html = await ctx.http.get("https://fimtale.com/rand", { responseType: "text", headers });
      let match = html.match(/FimTale\.topic\.init\((\d+)/) || html.match(/data-clipboard-text=".*?\/t\/(\d+)"/);
      return match ? match[1] : null;
    } catch (e) {
      return null;
    }
  }, "fetchRandomId");
  const searchThreads = /* @__PURE__ */ __name(async (keyword) => {
    let page;
    try {
      page = await ctx.puppeteer.page();
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36");
      await injectCookies(page);
      const searchUrl = `https://fimtale.com/topics?q=${encodeURIComponent(keyword)}`;
      await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 25e3 });
      try {
        await page.waitForSelector(".card", { timeout: 5e3 });
      } catch {
      }
      return await page.evaluate(() => {
        const items = [];
        document.querySelectorAll(".card.topic-card").forEach((card) => {
          if (items.length >= 6) return;
          const link = card.querySelector('a[href^="/t/"]');
          const id = link?.getAttribute("href")?.match(/^\/t\/(\d+)$/)?.[1];
          if (!id || items.some((i) => i.id === id)) return;
          let title = card.querySelector(".card-title")?.textContent?.trim() || link.textContent?.trim() || "";
          let author = card.querySelector('a[href^="/u/"] span.grey-text')?.textContent?.trim() || "";
          let cover = card.querySelector(".card-image img")?.getAttribute("src");
          if (cover && (cover.includes("avatar") && !cover.includes("upload"))) cover = void 0;
          const tags = [];
          card.querySelectorAll(".main-tag-set div, .chip").forEach((c) => {
            const t = c.textContent?.trim();
            if (t && !["连载中", "已完结", "已弃坑"].includes(t) && !t.includes("展开")) tags.push(t);
          });
          const status = Array.from(card.querySelectorAll(".chip")).find((c) => ["连载中", "已完结", "已弃坑"].includes(c.textContent?.trim() || ""))?.textContent?.trim() || "";
          const stats = { views: "0", comments: "0", likes: "0", words: "0" };
          card.querySelectorAll(".card-action > div span[title]").forEach((s) => {
            const t = s.getAttribute("title") || "";
            const v = s.textContent?.trim().replace(/[^0-9]/g, "") || "0";
            if (t.includes("字")) stats.words = v;
            if (t.includes("阅读")) stats.views = v;
            if (t.includes("评论")) stats.comments = v;
          });
          stats.likes = card.querySelector(".left.green-text")?.textContent?.replace(/[^0-9]/g, "") || "0";
          let updateTime = "";
          const timeTxt = card.querySelector('div[style*="margin: 3px 0;"] span.grey-text')?.textContent || "";
          const dateMatch = timeTxt.match(/(\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日)/) || timeTxt.match(/(\d+\s*(?:小时|分钟|天)前)/) || timeTxt.match(/(\d{1,2}\s*月\s*\d{1,2}\s*日)/);
          if (dateMatch) updateTime = dateMatch[1].replace(/\s/g, "");
          items.push({ id, title, author, cover, tags: tags.slice(0, 8), status, stats, updateTime });
        });
        return items;
      });
    } catch (e) {
      return [];
    } finally {
      if (page) await page.close();
    }
  }, "searchThreads");
  const renderCard = /* @__PURE__ */ __name(async (info, parent) => {
    const isChapter = info.IsChapter || !!parent && parent.ID !== info.ID;
    const displayTitle = isChapter && parent ? parent.Title : info.Title;
    let displayCover = info.Background || extractImage(info.Content);
    if (!displayCover && isChapter && parent) {
      displayCover = parent.Background || extractImage(parent.Content);
    }
    const displayTagsObj = isChapter && parent ? parent.Tags : info.Tags;
    const subTitle = isChapter ? info.Title : null;
    const bgStyle = displayCover ? `background-image: url('${displayCover}');` : `background: ${generateGradient(displayTitle)};`;
    let summary = stripHtml(info.Content);
    if (summary.length < 10 && parent && isChapter) summary = stripHtml(parent.Content);
    if (summary.length > 150) summary = summary.substring(0, 150) + "...";
    if (!summary) summary = "暂无简介";
    const tagsArr = [];
    if (displayTagsObj?.Type) tagsArr.push(displayTagsObj.Type);
    if (displayTagsObj?.Rating && displayTagsObj.Rating !== "E") tagsArr.push(displayTagsObj.Rating);
    if (displayTagsObj?.OtherTags) tagsArr.push(...displayTagsObj.OtherTags);
    const likes = isChapter && parent ? parent.Upvotes || 0 : info.Upvotes || 0;
    const html = `<!DOCTYPE html><html><head><style>
        body { margin: 0; padding: 0; font-family: ${fontStack}; background: transparent; }
        .card { width: 620px; height: 360px; background: #fff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); display: flex; overflow: hidden; }
        .cover { width: 220px; height: 100%; ${bgStyle} background-size: cover; background-position: center; position: relative; flex-shrink: 0; }
        .id-tag { position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.6); color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: bold; backdrop-filter: blur(4px); font-family: monospace; }
        .info { flex: 1; padding: 24px; display: flex; flex-direction: column; overflow: hidden; position: relative; }
        .title { font-size: 22px; font-weight: 700; color: #333; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 4px; }
        .subtitle { font-size: 15px; color: #555; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-left: 10px; border-left: 3px solid #e91e63; margin-top: 4px; }
        .author { font-size: 13px; color: #888; margin-top: 6px; font-weight: 400; }
        .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; flex-shrink: 0; }
        .tag { background: #eff2f5; color: #5c6b7f; padding: 3px 9px; border-radius: 4px; font-size: 11px; font-weight: 500; }
        .summary-box { flex: 1; position: relative; overflow: hidden; min-height: 0; }
        .summary { font-size: 13px; color: #666; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; padding-bottom: 3px; }
        .footer { border-top: 1px solid #eee; padding-top: 14px; display: flex; justify-content: space-between; font-size: 12px; color: #888; margin-top: auto; flex-shrink: 0; }
        .stat b { color: #555; font-weight: bold; margin-right: 2px;}
      </style></head><body>
      <div class="card"><div class="cover"><div class="id-tag">ID: ${info.ID}</div></div>
        <div class="info">
          <div class="header-group"><div class="title">${displayTitle}</div>${subTitle ? `<div class="subtitle">${subTitle}</div>` : ""}<div class="author">@${info.UserName}</div></div>
          <div class="tags">${tagsArr.slice(0, 10).map((t) => `<span class="tag">${t}</span>`).join("")}</div>
          <div class="summary-box"><div class="summary">${summary}</div></div>
          <div class="footer">
            <span class="stat"><b style="color:#009688">热度</b>${info.Views || 0}</span><span class="stat"><b style="color:#673ab7">评论</b>${info.Comments || 0}</span>
            <span class="stat"><b style="color:#4caf50">赞</b>${likes}</span><span class="stat"><b style="color:#795548">字数</b>${info.WordCount || 0}</span>
          </div></div></div></body></html>`;
    const page = await ctx.puppeteer.page();
    await injectCookies(page);
    await page.setContent(html);
    await page.setViewport({ width: 660, height: 480, deviceScaleFactor: 2 });
    const img = await page.$(".card").then((e) => e.screenshot({ type: "png" }));
    await page.close();
    return img;
  }, "renderCard");
  const renderSearchResults = /* @__PURE__ */ __name(async (keyword, results) => {
    const html = `<!DOCTYPE html><html><head><style>
        body { margin: 0; padding: 0; font-family: ${fontStack}; width: 500px; background: transparent; }
        .container { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15); margin: 10px; }
        .header { background: #fafafa; padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
        .header-title { font-size: 16px; font-weight: bold; color: #333; }
        .item { display: flex; padding: 15px; border-bottom: 1px solid #f5f5f5; height: 110px; align-items: flex-start; }
        .cover-box { width: 75px; height: 100%; border-radius: 6px; overflow: hidden; flex-shrink: 0; margin-right: 15px; background: #eee; }
        .cover-img { width: 100%; height: 100%; object-fit: cover; }
        .content { flex: 1; display: flex; flex-direction: column; justify-content: space-between; height: 100%; min-width: 0; }
        .top-row { display: flex; justify-content: space-between; align-items: flex-start; }
        .title { font-size: 16px; font-weight: bold; color: #222; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; flex:1; margin-right: 8px;}
        .id-badge { background: #455a64; color: #fff; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 11px; font-weight: bold; flex-shrink: 0; }
        .author { font-size: 12px; color: #666; }
        .tags { display: flex; gap: 4px; flex-wrap: wrap; height: 18px; overflow: hidden; margin-top: 4px; }
        .tag { background: #f3f3f3; color: #666; padding: 0 5px; border-radius: 3px; font-size: 10px; white-space: nowrap; line-height: 1.6;}
        .meta-row { display: flex; gap: 10px; font-size: 11px; color: #999; margin-top: auto; border-top: 1px dashed #eee; padding-top: 5px; }
        .stat b { margin-right: 1px; font-weight: bold; }
      </style></head><body><div class="container"><div class="header"><div class="header-title">🔍 "${keyword}"</div><div>Top ${results.length}</div></div><div class="list">
          ${results.map((r) => {
      const bg = r.cover ? `<img class="cover-img" src="${r.cover}"/>` : `<div style="width:100%;height:100%;background:${generateGradient(r.title)}"></div>`;
      return `<div class="item"><div class="cover-box">${bg}</div><div class="content">
              <div class="top-row"><div class="title">${r.title}</div><div class="id-badge">ID: ${r.id}</div></div>
              <div class="author">By ${r.author} ${r.status ? ` · ${r.status}` : ""}</div>
              <div class="tags">${r.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
              <div class="meta-row"><span style="color:#009688"><b>热</b>${r.stats.views}</span><span style="color:#673ab7"><b>评</b>${r.stats.comments}</span><span style="color:#4caf50"><b>赞</b>${r.stats.likes}</span><span style="margin-left:auto;color:#757575">${r.updateTime}</span></div>
            </div></div>`;
    }).join("")}
        </div></div></body></html>`;
    const page = await ctx.puppeteer.page();
    await page.setContent(html);
    await page.setViewport({ width: 550, height: 800, deviceScaleFactor: 2 });
    const img = await page.$(".container").then((e) => e.screenshot({ type: "png" }));
    await page.close();
    return img;
  }, "renderSearchResults");
  const renderReadPages = /* @__PURE__ */ __name(async (info) => {
    const content = cleanContent(info.Content);
    const headerHeight = 40;
    const footerHeight = 30;
    const paddingX = 25;
    const paddingY = 20;
    const lineHeightRatio = 1.6;
    const contentWidth = config.deviceWidth - paddingX * 2;
    const columnGap = 40;
    const maxContentHeight = config.deviceHeight - headerHeight - footerHeight;
    const lineHeightPx = config.fontSize * lineHeightRatio;
    const linesPerPage = Math.floor((maxContentHeight - paddingY * 2) / lineHeightPx);
    const optimalContentHeight = linesPerPage * lineHeightPx + paddingY * 2;
    const marginTop = Math.floor((maxContentHeight - optimalContentHeight) / 2) + headerHeight;
    const html = `<!DOCTYPE html><html><head><style>
        body { margin: 0; padding: 0; width: ${config.deviceWidth}px; height: ${config.deviceHeight}px; background-color: #f6f4ec; color: #2c2c2c; font-family: ${fontSerif}; overflow: hidden; position: relative;}
        .fixed-header { position: absolute; top: 0; left: 0; width: 100%; height: ${headerHeight}px; border-bottom: 1px solid #d7ccc8; box-sizing: border-box; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #8d6e63; background: #f6f4ec; z-index: 5; font-weight: bold; }
        .fixed-footer { position: absolute; bottom: 0; left: 0; width: 100%; height: ${footerHeight}px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #aaa; background: #f6f4ec; z-index: 5; }
        #viewport { position: absolute; top: ${marginTop}px; left: ${paddingX}px; width: ${contentWidth}px; height: ${optimalContentHeight}px; overflow: hidden; }
        #content-scroller { height: 100%; width: 100%; column-width: ${contentWidth}px; column-gap: ${columnGap}px; column-fill: auto; padding: ${paddingY}px 0; box-sizing: border-box; font-size: ${config.fontSize}px; line-height: ${lineHeightRatio}; text-align: left; transform: translateX(0); transition: none; }
        
        p, div { margin: 0 0 0.2em 0; text-indent: 2em; word-wrap: break-word; overflow-wrap: break-word; }
        
        .align-center { text-align: center !important; text-align-last: center !important; text-indent: 0 !important; margin: 0.8em 0; font-weight: bold; color: #5d4037; }
        .align-right { text-align: right !important; text-indent: 0 !important; margin-top: 0.5em; color: #666; font-style: italic; }
        .no-indent { text-indent: 0 !important; }
        
        blockquote { margin: 1em 0.5em; padding-left: 1em; border-left: 4px solid #d7ccc8; color: #666; }
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
        
        a { color: #0277bd; text-decoration: none; }

        figure.img-box { display: flex; justify-content: center; align-items: center; margin: 0.5em 0; width: 100%; }
        img { max-width: 100%; height: auto; display: block; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
        
        h1, h2, h3 { font-size: 1.1em; margin: 0.8em 0; color: #5d4037; text-indent: 0; font-weight: bold; text-align: center; text-align-last: center; break-after: avoid; }
        
        strong, b { font-weight: 900; color: #3e2723; }
        em, i { font-style: italic; }
        
        p:last-child { margin-bottom: 0; }
      </style></head><body>
      <div class="fixed-header"><span>${info.Title.substring(0, 12) + (info.Title.length > 12 ? "..." : "")}</span><span>${info.UserName}</span></div>
      <div id="viewport"><div id="content-scroller">${content}</div></div>
      <div class="fixed-footer" id="page-indicator">- 1 -</div></body></html>`;
    const page = await ctx.puppeteer.page();
    try {
      await injectCookies(page);
      await page.setContent(html);
      await page.setViewport({ width: config.deviceWidth, height: config.deviceHeight, deviceScaleFactor: 2 });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((resolve) => {
          const imgs2 = Array.from(document.images);
          if (!imgs2.length) return resolve(true);
          let loaded = 0;
          imgs2.forEach((img) => {
            if (img.complete) {
              loaded++;
              if (loaded === imgs2.length) resolve(true);
            } else {
              img.onload = img.onerror = () => {
                loaded++;
                if (loaded === imgs2.length) resolve(true);
              };
            }
          });
          setTimeout(resolve, 3e3);
        });
      });
      const scrollWidth = await page.$eval("#content-scroller", (el) => el.scrollWidth);
      const step = contentWidth + columnGap;
      const totalPages = Math.floor((scrollWidth + columnGap - 10) / step) + 1;
      const finalPages = Math.max(1, totalPages);
      const imgs = [];
      for (let i = 0; i < finalPages; i++) {
        await page.evaluate((idx, stepPx, curr, total) => {
          const offset = -(idx * stepPx);
          document.getElementById("content-scroller").style.transform = `translateX(${offset}px)`;
          document.getElementById("page-indicator").innerText = `- ${curr} / ${total} -`;
        }, i, step, i + 1, finalPages);
        imgs.push(await page.screenshot({ type: "jpeg", quality: 80 }));
      }
      return imgs;
    } finally {
      await page.close();
    }
  }, "renderReadPages");
  ctx.command("ft.info <threadId:string>", "预览作品").action(async ({ session }, threadId) => {
    if (!threadId) return "请输入ID";
    const res = await fetchThread(threadId);
    if (!res.valid) return `[错误] ${res.msg}`;
    return session.send(import_koishi.h.image(await renderCard(res.data, res.parent), "image/png"));
  });
  ctx.command("ft.read <threadId:string>", "阅读章节").action(async ({ session }, threadId) => {
    if (!threadId) return "请输入ID";
    const res = await fetchThread(threadId);
    if (!res.valid) return `[错误] 读取失败: ${res.msg}`;
    await session.send(`[加载中] ${res.data.Title}...`);
    try {
      const cardImg = await renderCard(res.data, res.parent);
      await session.send(import_koishi.h.image(cardImg, "image/png"));
      const pages = await renderReadPages(res.data);
      const nodes = pages.map((buf) => (0, import_koishi.h)("message", import_koishi.h.image(buf, "image/jpeg")));
      const navs = [];
      const mainId = res.parent ? res.parent.ID : res.data.ID;
      navs.push(`[目录] /ft.info ${mainId}`);
      if (res.menu?.length) {
        const idx = res.menu.findIndex((m) => m.ID.toString() === threadId);
        if (idx > 0) navs.push(`[上一章] /ft.read ${res.menu[idx - 1].ID}`);
        if (idx < res.menu.length - 1) navs.push(`[下一章] /ft.read ${res.menu[idx + 1].ID}`);
      }
      if (navs.length) nodes.push((0, import_koishi.h)("message", import_koishi.h.text("章节导航:\n" + navs.join("\n"))));
      return session.send((0, import_koishi.h)("message", { forward: true }, nodes));
    } catch (e) {
      ctx.logger("fimtale").error(e);
      return "[错误] 渲染失败";
    }
  });
  ctx.command("ft.random", "随机作品").action(async ({ session }) => {
    const id = await fetchRandomId();
    if (!id) return "[错误] 获取失败";
    const res = await fetchThread(id);
    if (!res.valid) return `[错误] ID:${id} 读取失败`;
    await session.send(import_koishi.h.image(await renderCard(res.data, res.parent), "image/png"));
    return `Tip: 发送 /ft.read ${res.data.ID} 阅读全文`;
  });
  ctx.command("ft.search <keyword:text>", "搜索作品").action(async ({ session }, keyword) => {
    if (!keyword) return "请输入关键词";
    await session.send("[加载中] 搜索中...");
    const results = await searchThreads(keyword);
    if (!results.length) return "未找到结果。";
    await session.send(import_koishi.h.image(await renderSearchResults(keyword, results), "image/png"));
    const exampleId = results[0]?.id || "12345";
    return `Tip: 发送 /ft.read [ID] 阅读 (例: /ft.read ${exampleId})`;
  });
  ctx.command("ft.sub <threadId:string>", "订阅").action(async ({ session }, threadId) => {
    if (!/^\d+$/.test(threadId)) return "ID错误";
    const exist = await ctx.database.get("fimtale_subs", { cid: session.cid, threadId });
    if (exist.length) return "已订阅";
    const res = await fetchThread(threadId);
    if (!res.valid) return "帖子不存在";
    await ctx.database.create("fimtale_subs", { cid: session.cid, threadId, lastCount: res.data.Comments, lastCheck: Date.now() });
    await session.send("[成功] 订阅成功");
    return session.send(import_koishi.h.image(await renderCard(res.data, res.parent), "image/png"));
  });
  ctx.command("ft.unsub <threadId:string>", "退订").action(async ({ session }, threadId) => {
    const res = await ctx.database.remove("fimtale_subs", { cid: session.cid, threadId });
    return res.matched ? "[成功] 已退订" : "未找到订阅";
  });
  ctx.middleware(async (session, next) => {
    if (!config.autoParseLink) return next();
    const match = session.content.match(/fimtale\.com\/t\/(\d+)/);
    if (match && match[1] && session.userId !== session.selfId) {
      const res = await fetchThread(match[1]);
      if (res.valid) {
        session.send(import_koishi.h.image(await renderCard(res.data, res.parent), "image/png"));
      }
    }
    return next();
  });
  ctx.setInterval(async () => {
    const subs = await ctx.database.get("fimtale_subs", {});
    if (!subs.length) return;
    const tids = [...new Set(subs.map((s) => s.threadId))];
    for (const tid of tids) {
      const res = await fetchThread(tid);
      if (!res.valid) continue;
      const targets = subs.filter((s) => s.threadId === tid && s.lastCount < res.data.Comments);
      if (targets.length) {
        const msg = `[更新] ${res.data.Title} 更新了！
回复: ${res.data.Comments}
https://fimtale.com/t/${tid}`;
        for (const sub of targets) {
          try {
            await ctx.broadcast([sub.cid], import_koishi.h.parse(msg));
            await ctx.database.set("fimtale_subs", { id: sub.id }, { lastCount: res.data.Comments });
          } catch {
          }
        }
      }
    }
  }, config.pollInterval);
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name
});
