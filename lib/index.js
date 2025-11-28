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
  const formatDate = /* @__PURE__ */ __name((timestamp) => {
    if (!timestamp) return "未知日期";
    const date = new Date(timestamp * 1e3);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
  }, "formatDate");
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
    return html.replace(/<p>\s*&nbsp;\s*<\/p>/gi, "").replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, "").replace(/<p>\s*<\/p>/gi, "").replace(/(<br\s*\/?>){2,}/gi, "<br>").replace(/margin-bottom:\s*\d+px/gi, "");
  }, "cleanContent");
  const fontStack = '"Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", "WenQuanYi Micro Hei", Arial, sans-serif';
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
      if (res.Status !== 1 || !res.TopicInfo) return { valid: false, msg: res.ErrorMessage || "API 返回错误" };
      return {
        valid: true,
        data: res.TopicInfo,
        parent: res.ParentInfo,
        menu: res.Menu || []
      };
    } catch (e) {
      return { valid: false, msg: "网络请求失败" };
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
      const results = await page.evaluate(() => {
        const items = [];
        const cards = document.querySelectorAll(".card.topic-card");
        cards.forEach((card) => {
          if (items.length >= 6) return;
          const link = card.querySelector('a[href^="/t/"]');
          const href = link?.getAttribute("href");
          const idMatch = href?.match(/^\/t\/(\d+)$/);
          if (!idMatch) return;
          const id = idMatch[1];
          if (items.some((i) => i.id === id)) return;
          let title = "";
          const titleEl = card.querySelector(".card-title");
          if (titleEl) title = titleEl.textContent?.trim() || "";
          else title = link.textContent?.trim() || "";
          let author = "未知";
          const authorEl = card.querySelector('a[href^="/u/"] span.grey-text');
          if (authorEl) author = authorEl.textContent?.trim() || "";
          let cover = void 0;
          const imgEl = card.querySelector(".card-image img");
          if (imgEl) {
            const src = imgEl.getAttribute("src");
            if (src && (!src.includes("avatar") || src.includes("upload"))) cover = src;
          }
          const tags = [];
          let status = "";
          card.querySelectorAll(".main-tag-set div").forEach((b) => {
            const t = b.textContent?.trim();
            if (t) tags.push(t);
          });
          card.querySelectorAll(".chip").forEach((c) => {
            const t = c.textContent?.trim();
            if (!t) return;
            if (["连载中", "已完结", "已弃坑"].includes(t)) status = t;
            else if (!t.includes("展开其余")) tags.push(t);
          });
          const stats = { views: "0", comments: "0", likes: "0", words: "0" };
          const actionDiv = card.querySelector(".card-action > div");
          if (actionDiv) {
            actionDiv.querySelectorAll("span[title]").forEach((s) => {
              const t = s.getAttribute("title") || "";
              const v = s.textContent?.trim().replace(/,/g, "") || "0";
              if (t.includes("字")) stats.words = v;
              if (t.includes("阅读")) stats.views = v;
              if (t.includes("评论")) stats.comments = v;
            });
          }
          const greenText = card.querySelector(".left.green-text");
          if (greenText) stats.likes = greenText.textContent?.replace(/[^0-9]/g, "") || "0";
          let updateTime = "";
          const timeSpan = card.querySelector('div[style*="margin: 3px 0;"] span.grey-text');
          if (timeSpan) {
            const txt = timeSpan.textContent || "";
            const dateMatch = txt.match(/(\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日)/) || txt.match(/(\d+\s*(?:小时|分钟|天)前)/) || txt.match(/(\d{1,2}\s*月\s*\d{1,2}\s*日)/);
            if (dateMatch) updateTime = dateMatch[1].replace(/\s/g, "");
          }
          items.push({ id, title, author, cover, tags: tags.slice(0, 8), status, stats, updateTime });
        });
        return items;
      });
      return results;
    } catch (e) {
      return [];
    } finally {
      if (page) await page.close();
    }
  }, "searchThreads");
  const renderCard = /* @__PURE__ */ __name(async (info, parent) => {
    const isChapter = info.IsChapter || !!parent && parent.ID !== info.ID;
    const displayTitle = isChapter && parent ? parent.Title : info.Title;
    const displayCover = isChapter && parent ? parent.Background || extractImage(parent.Content) : info.Background || extractImage(info.Content);
    const displayTagsObj = isChapter && parent ? parent.Tags : info.Tags;
    const subTitle = isChapter ? info.Title : null;
    const views = info.Views || 0;
    const comments = info.Comments || 0;
    const words = info.WordCount || 0;
    const likes = info.Upvotes || 0;
    const bgStyle = displayCover ? `background-image: url('${displayCover}');` : `background: ${generateGradient(displayTitle)};`;
    let summary = stripHtml(info.Content);
    if (summary.length < 10 && parent && isChapter) summary = stripHtml(parent.Content);
    if (summary.length > 100) summary = summary.substring(0, 100) + "...";
    if (!summary) summary = "暂无简介";
    const tagsArr = [];
    if (displayTagsObj?.Type) tagsArr.push(displayTagsObj.Type);
    if (displayTagsObj?.Rating && displayTagsObj.Rating !== "E") tagsArr.push(displayTagsObj.Rating);
    if (displayTagsObj?.OtherTags && Array.isArray(displayTagsObj.OtherTags)) {
      tagsArr.push(...displayTagsObj.OtherTags);
    }
    const displayTags = tagsArr.slice(0, 10);
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; padding: 0; font-family: ${fontStack}; background: transparent; }
        .card { width: 600px; height: 320px; background: #fff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); display: flex; overflow: hidden; }
        .cover { width: 220px; height: 100%; ${bgStyle} background-size: cover; background-position: center; position: relative; flex-shrink: 0; }
        .id-tag { position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.6); color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: bold; backdrop-filter: blur(4px); font-family: monospace; }
        .info { flex: 1; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
        
        .title { 
          font-size: 22px; font-weight: 700; color: #333; line-height: 1.35; 
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; 
        }
        .subtitle {
          font-size: 15px; color: #555; margin-top: 6px; font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          padding-left: 10px; border-left: 3px solid #e91e63;
        }
        
        .author { font-size: 13px; color: #888; margin-top: 8px; font-weight: 400; }
        
        .tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; max-height: 56px; overflow: hidden; }
        .tag { background: #eff2f5; color: #5c6b7f; padding: 3px 9px; border-radius: 4px; font-size: 11px; font-weight: 500; }
        .tag-imp { background: #e3f2fd; color: #1565c0; }
        
        .summary { 
            font-size: 13px; color: #666; line-height: 1.6; 
            display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; 
            margin-top: auto; 
        }
        .footer { border-top: 1px solid #eee; padding-top: 14px; display: flex; justify-content: space-between; font-size: 12px; color: #888; margin-top: 15px; }
        .stat b { color: #555; font-weight: bold; margin-right: 2px;}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="cover"><div class="id-tag">ID: ${info.ID}</div></div>
        <div class="info">
          <div>
            <div class="title">${displayTitle}</div>
            ${subTitle ? `<div class="subtitle">${subTitle}</div>` : ""}
            <div class="author">@${info.UserName}</div>
            <div class="tags">${displayTags.map((t) => `<span class="tag ${["文", "译", "R"].includes(t) ? "tag-imp" : ""}">${t}</span>`).join("")}</div>
          </div>
          <div class="summary">${summary}</div>
          <div class="footer">
            <span class="stat"><b style="color:#009688">热度</b>${views}</span>
            <span class="stat"><b style="color:#673ab7">评论</b>${comments}</span>
            <span class="stat"><b style="color:#4caf50">赞</b>${likes}</span>
            <span class="stat"><b style="color:#795548">字数</b>${words}</span>
          </div>
        </div>
      </div>
    </body></html>`;
    const page = await ctx.puppeteer.page();
    await injectCookies(page);
    await page.setContent(html);
    await page.setViewport({ width: 640, height: 440, deviceScaleFactor: 2 });
    const el = await page.$(".card");
    const img = await el.screenshot({ type: "png" });
    await page.close();
    return img;
  }, "renderCard");
  const renderSearchResults = /* @__PURE__ */ __name(async (keyword, results) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; padding: 0; font-family: ${fontStack}; width: 500px; background: transparent; }
        .container { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15); margin: 10px; }
        .header { background: #fafafa; padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
        .header-title { font-size: 16px; font-weight: bold; color: #333; }
        .list { padding: 0; }
        .item { display: flex; padding: 15px; border-bottom: 1px solid #f5f5f5; height: 110px; align-items: flex-start; }
        .cover-box { width: 75px; height: 100%; border-radius: 6px; overflow: hidden; flex-shrink: 0; margin-right: 15px; background: #eee; position: relative; }
        .cover-img { width: 100%; height: 100%; object-fit: cover; }
        .content { flex: 1; display: flex; flex-direction: column; justify-content: space-between; height: 100%; min-width: 0; }
        .top-row { display: flex; justify-content: space-between; align-items: flex-start; }
        .title { font-size: 16px; font-weight: bold; color: #222; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 4px; flex:1; margin-right: 8px;}
        .id-badge { background: #455a64; color: #fff; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 11px; font-weight: bold; flex-shrink: 0; }
        .author { font-size: 12px; color: #666; }
        .tags { display: flex; gap: 4px; flex-wrap: wrap; height: 18px; overflow: hidden; margin-top: 4px; }
        .tag { background: #f3f3f3; color: #666; padding: 0 5px; border-radius: 3px; font-size: 10px; white-space: nowrap; line-height: 1.6;}
        .meta-row { display: flex; gap: 10px; font-size: 11px; color: #999; margin-top: auto; border-top: 1px dashed #eee; padding-top: 5px; }
        .stat b { margin-right: 1px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><div class="header-title">🔍 "${keyword}"</div><div>Top ${results.length}</div></div>
        <div class="list">
          ${results.map((r) => {
      const bg = r.cover ? `<img class="cover-img" src="${r.cover}"/>` : `<div style="width:100%;height:100%;background:${generateGradient(r.title)}"></div>`;
      const stats = [
        r.stats.views && r.stats.views != "0" ? `<span class="stat" style="color:#009688"><b>热</b>${r.stats.views}</span>` : "",
        r.stats.comments && r.stats.comments != "0" ? `<span class="stat" style="color:#673ab7"><b>评</b>${r.stats.comments}</span>` : "",
        r.stats.likes && r.stats.likes != "0" ? `<span class="stat" style="color:#4caf50"><b>赞</b>${r.stats.likes}</span>` : "",
        r.updateTime ? `<span class="stat" style="margin-left:auto;color:#757575">${r.updateTime}</span>` : ""
      ].join("");
      return `<div class="item"><div class="cover-box">${bg}</div><div class="content">
              <div class="top-row"><div class="title">${r.title}</div><div class="id-badge">ID: ${r.id}</div></div>
              <div class="author">By ${r.author} ${r.status ? ` · ${r.status}` : ""}</div>
              <div class="tags">${r.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
              <div class="meta-row">${stats || "暂无数据"}</div>
            </div></div>`;
    }).join("")}
        </div>
      </div>
    </body></html>`;
    const page = await ctx.puppeteer.page();
    await page.setContent(html);
    await page.setViewport({ width: 550, height: 800, deviceScaleFactor: 2 });
    await sleep(300);
    const el = await page.$(".container");
    const img = await el.screenshot({ type: "png" });
    await page.close();
    return img;
  }, "renderSearchResults");
  const renderReadPages = /* @__PURE__ */ __name(async (info) => {
    const cleanedContent = cleanContent(info.Content);
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; padding: 0; width: ${config.deviceWidth}px; background-color: #f6f4ec; color: #2c2c2c; font-family: ${fontStack}; }
        #source-container { display: none; }
        .page {
          width: ${config.deviceWidth}px; height: ${config.deviceHeight}px;
          padding: 35px 28px; box-sizing: border-box;
          position: relative; background: #f6f4ec; overflow: hidden;
          display: flex; flex-direction: column;
        }
        .page-header { 
          font-size: 12px; color: #8d6e63; border-bottom: 2px solid #d7ccc8; 
          padding-bottom: 12px; margin-bottom: 15px; flex-shrink: 0;
          display: flex; justify-content: space-between; font-weight: bold;
        }
        .page-footer {
          position: absolute; bottom: 15px; left: 0; right: 0; text-align: center;
          font-size: 12px; color: #aaa; font-family: sans-serif;
        }
        .page-content { flex: 1; overflow: hidden; font-size: ${config.fontSize}px; line-height: 1.7; text-align: justify; }
        /* 段落样式优化 */
        p { margin: 0 0 0.6em 0; text-indent: 2em; }
        img { max-width: 100%; height: auto; display: block; margin: 10px auto; border-radius: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        h1, h2, h3 { font-size: 1.1em; margin: 0.5em 0; color: #5d4037; text-indent: 0; font-weight: bold; }
      </style>
    </head>
    <body>
      <div id="source-container"><div class="meta-info" data-title="${info.Title}" data-author="${info.UserName}"></div>${cleanedContent}</div>
      <div id="output"></div>
      <script>
        function paginate() {
          const source = document.getElementById('source-container');
          const output = document.getElementById('output');
          const title = source.querySelector('.meta-info').dataset.title;
          const author = source.querySelector('.meta-info').dataset.author;
          let pageIndex = 1;
          let currentPageContent = null;
          function createNewPage() {
            const page = document.createElement('div'); page.className = 'page';
            const header = document.createElement('div'); header.className = 'page-header';
            header.innerHTML = \`<span>\${title.substring(0, 12) + (title.length>12?'...':'')}</span><span>\${author}</span>\`;
            page.appendChild(header);
            const content = document.createElement('div'); content.className = 'page-content';
            page.appendChild(content);
            const footer = document.createElement('div'); footer.className = 'page-footer';
            footer.id = 'footer-' + pageIndex;
            page.appendChild(footer);
            output.appendChild(page);
            currentPageContent = content;
            return page;
          }
          createNewPage();
          const children = Array.from(source.children);
          for (const child of children) {
            if (child.className === 'meta-info') continue;
            currentPageContent.appendChild(child.cloneNode(true));
            if (currentPageContent.scrollHeight > currentPageContent.clientHeight) {
              currentPageContent.removeChild(currentPageContent.lastChild);
              pageIndex++;
              createNewPage();
              currentPageContent.appendChild(child.cloneNode(true));
            }
          }
          for(let i=1; i<=pageIndex; i++) document.getElementById('footer-'+i).innerText = \`- \${i} / \${pageIndex} -\`;
          return pageIndex;
        }
      </script>
    </body></html>`;
    const page = await ctx.puppeteer.page();
    try {
      await injectCookies(page);
      await page.setContent(html);
      await page.setViewport({ width: config.deviceWidth, height: config.deviceHeight, deviceScaleFactor: 2 });
      await page.evaluate("paginate()");
      const imgs = [];
      const pages = await page.$$(".page");
      for (const p of pages) {
        imgs.push(await p.screenshot({ type: "jpeg", quality: 80 }));
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
    const img = await renderCard(res.data, res.parent);
    return session.send(import_koishi.h.image(img, "image/png"));
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
    const img = await renderCard(res.data, res.parent);
    await session.send(import_koishi.h.image(img, "image/png"));
    return `提示: 发送 /ft.read ${res.data.ID} 阅读全文`;
  });
  ctx.command("ft.search <keyword:text>", "搜索作品").action(async ({ session }, keyword) => {
    if (!keyword) return "请输入关键词";
    await session.send("[加载中] 搜索中...");
    const results = await searchThreads(keyword);
    if (!results.length) return "未找到结果。";
    const img = await renderSearchResults(keyword, results);
    await session.send(import_koishi.h.image(img, "image/png"));
    return "提示: 发送 /ft.read <ID> 阅读";
  });
  ctx.command("ft.sub <threadId:string>", "订阅").action(async ({ session }, threadId) => {
    if (!/^\d+$/.test(threadId)) return "ID错误";
    const exist = await ctx.database.get("fimtale_subs", { cid: session.cid, threadId });
    if (exist.length) return "已订阅";
    const res = await fetchThread(threadId);
    if (!res.valid) return "帖子不存在";
    await ctx.database.create("fimtale_subs", { cid: session.cid, threadId, lastCount: res.data.Comments, lastCheck: Date.now() });
    await session.send("[成功] 订阅成功");
    const img = await renderCard(res.data, res.parent);
    return session.send(import_koishi.h.image(img, "image/png"));
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
        const img = await renderCard(res.data, res.parent);
        session.send(import_koishi.h.image(img, "image/png"));
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
