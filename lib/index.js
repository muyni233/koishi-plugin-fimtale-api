var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var import_koishi2 = require("koishi");

// src/utils.ts
var fontStack = '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif';
var fontSerif = '"Noto Serif SC", "Source Han Serif SC", "SimSun", serif';
var stripHtml = /* @__PURE__ */ __name((html) => {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}, "stripHtml");
var summarizeHtml = /* @__PURE__ */ __name((html, maxLen = 250) => {
  if (!html) return "";
  let s = html;
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gmi, "");
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gmi, "");
  s = s.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gmi, "");
  s = s.replace(/<img[^>]*\/?>/gi, "");
  s = s.replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, "");
  s = s.replace(/<div class="right">[\s\S]*?<\/div>/i, "");
  s = s.replace(/<div class="title-tags"[\s\S]*?<\/div>/i, "");
  s = s.replace(/<p class="status-bar[\s\S]*?<\/p>/i, "");
  s = s.replace(/<div class="card-panel[\s\S]*?<\/div>/i, "");
  s = s.replace(/<\/?div[^>]*>/gi, "");
  s = s.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, "<p><strong>$1</strong></p>");
  s = s.replace(/<(p|br|b|strong|i|em|blockquote)(\s[^>]*)?>/gi, "<$1>");
  s = s.replace(/<\/?(span|font|o:p|a|table|thead|tbody|tr|th|td|ul|ol|li|pre|code|s|del|strike|u|sup|sub|hr)[^>]*>/gi, "");
  s = s.replace(/&nbsp;/gi, " ");
  s = s.replace(/<p>\s*<\/p>/gi, "");
  s = s.replace(/<p>\s*(<br>)?\s*<\/p>/gi, "");
  s = s.replace(/(<br>\s*){3,}/gi, "<br><br>");
  s = s.replace(/\s+/g, " ");
  s = s.trim();
  const textOnly = s.replace(/<[^>]+>/g, "").trim();
  if (textOnly.length <= maxLen) return s;
  let textCount = 0;
  let inTag = false;
  let cutPos = s.length;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "<") {
      inTag = true;
      continue;
    }
    if (s[i] === ">") {
      inTag = false;
      continue;
    }
    if (!inTag) {
      textCount++;
      if (textCount >= maxLen) {
        cutPos = i + 1;
        break;
      }
    }
  }
  s = s.substring(0, cutPos);
  const openTags = [];
  const tagRegex = /<\/?([a-z]+)[^>]*>/gi;
  let m;
  while ((m = tagRegex.exec(s)) !== null) {
    const tag = m[1].toLowerCase();
    if (m[0].startsWith("</")) {
      const idx = openTags.lastIndexOf(tag);
      if (idx !== -1) openTags.splice(idx, 1);
    } else if (!m[0].endsWith("/>") && tag !== "br") {
      openTags.push(tag);
    }
  }
  for (let i = openTags.length - 1; i >= 0; i--) {
    s += `</${openTags[i]}>`;
  }
  s += "...";
  return s;
}, "summarizeHtml");
var extractImage = /* @__PURE__ */ __name((html) => {
  if (!html) return null;
  const match = html.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
  return match ? match[1] : null;
}, "extractImage");
var generateGradient = /* @__PURE__ */ __name((str) => {
  let hash = 0;
  for (let i = 0; i < (str || "default").length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 45) % 360;
  const s = 50 + Math.abs(hash) % 20;
  const l1 = 60 + Math.abs(hash >> 2) % 15;
  const l2 = 70 + Math.abs(hash >> 3) % 15;
  return `linear-gradient(135deg, hsl(${h1}, ${s}%, ${l1}%) 0%, hsl(${h2}, ${s}%, ${l2}%) 100%)`;
}, "generateGradient");
var cleanContent = /* @__PURE__ */ __name((html) => {
  if (!html) return "";
  let processed = html;
  processed = processed.replace(/<div class="right">[\s\S]*?<\/div>/i, "");
  processed = processed.replace(/<div class="title-tags"[\s\S]*?<\/div>/i, "");
  processed = processed.replace(/<p class="status-bar[\s\S]*?<\/p>/i, "");
  processed = processed.replace(/<div class="card-panel[\s\S]*?<\/div>/i, "");
  processed = processed.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "");
  processed = processed.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, "");
  processed = processed.replace(/<iframe[^>]*>.*?<\/iframe>/gmi, '<p class="align-center" style="color:#78909C;font-size:0.8em;">[多媒体内容]</p>');
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
var injectCookies = /* @__PURE__ */ __name(async (page, cookies) => {
  if (!cookies) return;
  const cookieList = cookies.split(";").map((pair) => {
    const parts = pair.trim().split("=");
    if (parts.length < 2) return null;
    return { name: parts[0].trim(), value: parts.slice(1).join("=").trim(), domain: "fimtale.com", path: "/" };
  }).filter((c) => c !== null);
  if (cookieList.length) await page.setCookie(...cookieList);
}, "injectCookies");

// src/api.ts
function createApi(ctx, config, logger, debugLog) {
  const normalizeTopicInfo = /* @__PURE__ */ __name((raw) => {
    if (!raw) return raw;
    let upvotes = raw.Upvotes ?? 0;
    let downvotes = raw.Downvotes ?? 0;
    if (!raw.Upvotes && typeof raw.rating === "string" && raw.rating.includes("/")) {
      const parts = raw.rating.split("/");
      upvotes = parseInt(parts[0], 10) || 0;
      downvotes = parseInt(parts[1], 10) || 0;
    }
    if (raw.Tags && typeof raw.Tags === "object") {
      raw.Tags.Rating = raw.Tags.Rating || raw.Tags.Rate;
    }
    return {
      ...raw,
      Upvotes: upvotes,
      Downvotes: downvotes,
      Followers: raw.Followers ?? 0,
      HighPraise: raw.HighPraise ?? 0,
      WordCount: raw.WordCount ?? 0
    };
  }, "normalizeTopicInfo");
  const scrapeThreadFromHtml = /* @__PURE__ */ __name(async (threadId) => {
    let page;
    debugLog(`[Fallback] Starting HTML scrape for thread ${threadId}...`);
    try {
      page = await ctx.puppeteer.page();
      await injectCookies(page, config.cookies);
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
      const targetUrl = `https://fimtale.com/t/${threadId}`;
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 6e4 });
      try {
        await page.waitForSelector('#title, .passage, input[name="username"]', { timeout: 15e3 });
      } catch (e) {
      }
      const pageTitle = await page.title();
      if (pageTitle.includes("404") || pageTitle.includes("Error")) {
        return { valid: false, msg: `页面不存在或服务器错误` };
      }
      const result = await page.evaluate((tid) => {
        if (document.querySelector('input[name="username"]') || document.body.innerText.includes("登录后查看")) {
          return { error: "内容受限(需登录)" };
        }
        const errorPanel = document.querySelector(".card-panel.red, .card-panel.orange");
        if (errorPanel) return { error: errorPanel.textContent.trim() };
        const titleEl = document.querySelector("#title");
        const title = titleEl?.textContent?.trim() || document.title.replace(" - FimTale", "").trim();
        let userName = "未知作者";
        const authorEl = document.querySelector('.option-bar a[href^="/u/"] .original-colored-text');
        if (authorEl) {
          const clone = authorEl.cloneNode(true);
          clone.querySelectorAll("span").forEach((b) => b.remove());
          userName = clone.textContent?.trim() || "未知作者";
        }
        let content = "";
        let background = null;
        const passageEl = document.querySelector(".passage");
        if (passageEl) {
          const firstImg = passageEl.querySelector("img");
          if (firstImg) background = firstImg.src;
          const contentClone = passageEl.cloneNode(true);
          contentClone.querySelectorAll("img").forEach((img) => {
            if (img.src) img.setAttribute("src", img.src);
          });
          content = contentClone.innerHTML || "";
        }
        let views = 0, comments = 0, words = 0, upvotes = 0, downvotes = 0, followers = 0, highPraise = 0;
        let statEl = document.querySelector('.status-bar span[title*="字"]');
        if (statEl) words = parseInt(statEl.getAttribute("title")?.replace(/[^0-9]/g, "") || statEl.textContent?.replace(/[^0-9]/g, "") || "0");
        statEl = document.querySelector('.status-bar span[title*="阅读"]');
        if (statEl) views = parseInt(statEl.getAttribute("title")?.replace(/[^0-9]/g, "") || statEl.textContent?.replace(/[^0-9]/g, "") || "0");
        statEl = document.querySelector('.status-bar span[title*="评论"]');
        if (statEl) comments = parseInt(statEl.getAttribute("title")?.replace(/[^0-9]/g, "") || statEl.textContent?.replace(/[^0-9]/g, "") || "0");
        statEl = document.querySelector('span[title*="赞"] .upvote-num') || document.querySelector(".upvote-num");
        if (statEl) upvotes = parseInt(statEl.textContent?.replace(/[^0-9]/g, "") || "0");
        statEl = document.querySelector(".downvote-num");
        if (statEl) downvotes = parseInt(statEl.textContent?.replace(/[^0-9]/g, "") || "0");
        statEl = document.querySelector(".favorite-num");
        if (statEl) followers = parseInt(statEl.textContent?.replace(/[^0-9]/g, "") || "0");
        statEl = document.querySelector(".high-praise-num");
        if (statEl) highPraise = parseInt(statEl.textContent?.replace(/[^0-9]/g, "") || "0");
        const tagList = [];
        document.querySelectorAll(".title-tags .chip span").forEach((el) => {
          const t = el.textContent?.trim();
          if (t) tagList.push(t);
        });
        let tType = "Scraped", tRating = tagList.includes("血腥暴力") || tagList.includes("轻微性暗示") ? "R" : "General", tLength = "", tSource = "";
        document.querySelectorAll(".main-tag-set div").forEach((el) => {
          const txt = el.textContent?.trim() || "";
          const title2 = el.getAttribute("title") || "";
          if (title2.includes("读") || ["E", "T", "M", "R"].includes(txt)) tRating = txt;
          else if (title2.includes("篇幅") || ["短", "中", "长"].includes(txt)) tLength = txt;
          else if (title2.includes("译") || title2.includes("原")) tSource = txt;
          else tType = txt;
        });
        const topicInfo = {
          ID: parseInt(tid),
          Title: title,
          UserName: userName,
          Content: content || "<p>正文提取失败</p>",
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
        };
        const menu = [];
        document.querySelectorAll("ul#menu li").forEach((li) => {
          const a = li.querySelector("a");
          if (!a) return;
          const rightSpan = a.querySelector(".right");
          if (rightSpan) rightSpan.remove();
          const itemTitle = a.textContent?.trim() || "无题";
          if (itemTitle.includes("收起") || a.querySelector("i")?.textContent?.includes("")) return;
          let itemID = null;
          const href = a.getAttribute("href");
          if (href && href.match(/\/t\/(\d+)/)) {
            itemID = parseInt(href.match(/\/t\/(\d+)/)[1]);
          } else if (li.classList.contains("active")) {
            itemID = parseInt(tid);
          }
          if (itemID !== null) {
            menu.push({ ID: itemID, Title: itemTitle });
          }
        });
        let parentInfo = null;
        if (menu.length > 0) {
          parentInfo = {
            ID: menu[0].ID,
            Title: menu[0].Title
          };
          if (menu.length > 1 && parseInt(tid) !== menu[0].ID) {
            topicInfo.IsChapter = true;
            parentInfo.Title = document.title.replace(" - FimTale", "").trim();
          } else {
            parentInfo = { ID: parseInt(tid), Title: topicInfo.Title };
          }
        } else {
          parentInfo = { ID: parseInt(tid), Title: topicInfo.Title };
        }
        return { topic: topicInfo, menu, parent: parentInfo };
      }, threadId);
      if (result.error) {
        return { valid: false, msg: `网页提示: ${result.error}` };
      }
      debugLog(`[Fallback] Scrape complete. Title: ${result.topic.Title}, Menu Items: ${result.menu.length}`);
      return {
        valid: true,
        data: result.topic,
        parent: result.parent,
        menu: result.menu
      };
    } catch (e) {
      logger.error(`[Fallback] Scrape critical error for ${threadId}:`, e);
      return { valid: false, msg: `爬虫错误: ${e.message}` };
    } finally {
      if (page) await page.close();
    }
  }, "scrapeThreadFromHtml");
  const fetchThread = /* @__PURE__ */ __name(async (threadId) => {
    const runApi = /* @__PURE__ */ __name(async () => {
      const url = `${config.apiUrl}/t/${threadId}`;
      const params = { APIKey: config.apiKey, APIPass: config.apiPass };
      try {
        debugLog(`[API] Fetching: ${url}`);
        const rawRes = await ctx.http.get(url, { params, responseType: "text" });
        if (!rawRes) return { success: false, msg: "Empty Response" };
        if (rawRes.includes("Fatal error") || rawRes.includes("<b>Warning</b>")) {
          debugLog(`[API] Server Error detected.`);
          return { success: false, msg: "Server Fatal Error" };
        }
        const jsonStartMarker = '{"Status":';
        const idx = rawRes.indexOf(jsonStartMarker);
        if (idx === -1) return { success: false, msg: "Invalid JSON" };
        const res = JSON.parse(rawRes.substring(idx));
        if (res.Status !== 1 || !res.TopicInfo) return { success: false, msg: res.ErrorMessage || "API Status Error" };
        const data = normalizeTopicInfo(res.TopicInfo);
        const parent = res.ParentInfo ? normalizeTopicInfo(res.ParentInfo) : void 0;
        const targetId = parent ? parent.ID : data.ID;
        try {
          const webUrl = url.replace("/api/v1", "");
          const html = await ctx.http.get(webUrl, { headers: config.cookies ? { Cookie: config.cookies } : {}, responseType: "text" });
          const isPicture = html.includes('title="这是一本漫画或画册。"') || html.includes(">图</div>");
          if (isPicture) {
            data.Tags = data.Tags || {};
            data.Tags.Type = "图";
            if (parent) {
              parent.Tags = parent.Tags || {};
              parent.Tags.Type = "图";
            }
          }
          const wordsMatch = html.match(/title="共\s*([0-9,]+)\s*(?:字|幅图)"/);
          if (wordsMatch) {
            const count = parseInt(wordsMatch[1].replace(/,/g, ""), 10);
            if (parent) parent.WordCount = Math.max(parent.WordCount || 0, count);
            else data.WordCount = Math.max(data.WordCount || 0, count);
          }
          const favMatch = html.match(/class="favorite-num[^>]*>\s*([0-9,]+)/);
          if (favMatch) {
            const count = parseInt(favMatch[1].replace(/,/g, ""), 10);
            if (parent) parent.Followers = Math.max(parent.Followers || 0, count);
            else data.Followers = Math.max(data.Followers || 0, count);
          }
          const hpMatch = html.match(/class="high-praise-num[^>]*>\s*([0-9,]+)/);
          if (hpMatch) {
            const count = parseInt(hpMatch[1].replace(/,/g, ""), 10);
            if (parent) parent.HighPraise = Math.max(parent.HighPraise || 0, count);
            else data.HighPraise = Math.max(data.HighPraise || 0, count);
          }
          const downMatch = html.match(/class="downvote-num[^>]*>\s*([0-9,]+)/);
          if (downMatch) {
            const count = parseInt(downMatch[1].replace(/,/g, ""), 10);
            if (parent) parent.Downvotes = Math.max(parent.Downvotes || 0, count);
            else data.Downvotes = Math.max(data.Downvotes || 0, count);
          }
        } catch (e) {
          debugLog(`[API] Supplement True Details failed: ` + e.message);
        }
        return { success: true, data, parent, menu: res.Menu || [] };
      } catch (e) {
        return { success: false, msg: e.message };
      }
    }, "runApi");
    const apiRes = await runApi();
    if (apiRes.success) {
      debugLog(`[API] Success for ${threadId}`);
      return { valid: true, data: apiRes.data, parent: apiRes.parent, menu: apiRes.menu };
    }
    debugLog(`[API] Failed for ${threadId} (${apiRes.msg}). Checking fallback...`);
    if (config.enableFallback) {
      const scrapeRes = await scrapeThreadFromHtml(threadId);
      if (scrapeRes.valid) {
        return { valid: true, data: scrapeRes.data, parent: scrapeRes.parent, menu: scrapeRes.menu };
      } else {
        return { valid: false, msg: `API错误且${scrapeRes.msg}` };
      }
    }
    return { valid: false, msg: `API请求失败: ${apiRes.msg}` };
  }, "fetchThread");
  const fetchRandomId = /* @__PURE__ */ __name(async () => {
    try {
      debugLog("Fetching random thread ID...");
      const headers = config.cookies ? { Cookie: config.cookies } : {};
      const html = await ctx.http.get("https://fimtale.com/rand", { responseType: "text", headers });
      let match = html.match(/FimTale\.topic\.init\((\d+)/) || html.match(/data-clipboard-text=".*?\/t\/(\d+)"/);
      return match ? match[1] : null;
    } catch (e) {
      return null;
    }
  }, "fetchRandomId");
  const searchThreads = /* @__PURE__ */ __name(async (keyword) => {
    debugLog(`Starting web search for keyword: "${keyword}"`);
    try {
      const searchUrl = `https://fimtale.com/topics?q=${encodeURIComponent(keyword)}`;
      const headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36" };
      if (config.cookies) headers["Cookie"] = config.cookies;
      const html = await ctx.http.get(searchUrl, {
        headers,
        responseType: "text"
      });
      const items = [];
      const blocks = html.split(/<div[^>]*class="[^"]*card topic-card[^"]*"[^>]*>/).slice(1);
      for (const raw of blocks) {
        if (items.length >= 6) break;
        const linkMatch = raw.match(/href="\/t\/(\d+)"/);
        if (!linkMatch) continue;
        const id = linkMatch[1];
        if (items.some((i) => i.id === id)) continue;
        const titleMatch = raw.match(/class="card-title[^>]*>([\s\S]*?)<\/span>/);
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";
        const authorMatch = raw.match(/href="\/u\/[^"]+"[^>]*>([\s\S]*?)<\/a>/);
        const author = authorMatch ? authorMatch[1].replace(/<[^>]+>/g, "").trim() : "";
        const coverMatch = raw.match(/class="card-image[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/);
        let cover = coverMatch ? coverMatch[1] : void 0;
        if (cover && cover.includes("avatar") && !cover.includes("upload")) cover = void 0;
        const tags = [];
        const mtMatch = raw.match(/<div class="main-tag-set[^>]*>([\s\S]*?)<\/div>\s*<div/);
        if (mtMatch) {
          const mtChips = mtMatch[1].match(/<div[^>]*>([\s\S]*?)<\/div>/g);
          if (mtChips) {
            for (const c of mtChips) {
              const txt = c.replace(/<[^>]+>/g, "").trim();
              if (txt) tags.push(txt);
            }
          }
        }
        const chipsMatch = raw.match(/<div class="chip[^>]*>[\s\S]*?<\/div>/g);
        if (chipsMatch) {
          for (const chip of chipsMatch) {
            const t = chip.replace(/<[^>]+>/g, "").trim();
            if (t && !["连载中", "已完结", "已弃坑"].includes(t) && !t.includes("展开")) tags.push(t);
          }
        }
        const stats = { views: "0", comments: "0", likes: "0", words: "0", followers: "0" };
        const extractStat = /* @__PURE__ */ __name((pattern, suffix = "") => {
          const m = raw.match(pattern);
          return m ? m[1].replace(/,/g, "") + suffix : "0";
        }, "extractStat");
        const wordMatch = raw.match(/title="[^"]*字"[^>]*>[\s\S]*?>([\d,]+)<\/span>/);
        if (wordMatch) {
          stats.words = wordMatch[1].replace(/,/g, "");
        } else {
          const picMatch = raw.match(/title="[^"]*幅图"[^>]*>[\s\S]*?>([\d,]+)<\/span>/);
          if (picMatch) stats.words = picMatch[1].replace(/,/g, "") + " P";
        }
        stats.views = extractStat(/title="[^"]*阅读"[^>]*>[\s\S]*?>([\d,]+)<\/span>/);
        stats.comments = extractStat(/title="[^"]*评论"[^>]*>[\s\S]*?>([\d,]+)<\/span>/);
        stats.followers = extractStat(/title="[^"]*(?:HighPraise|收藏)"[^>]*>[\s\S]*?>([\d,]+)<\/span>/);
        const likesMatch = raw.match(/<div class="left green-text[^>]*>[\s\S]*?<\/i>\s*([\d,]+)/);
        if (likesMatch) {
          stats.likes = likesMatch[1].replace(/,/g, "");
        } else {
          stats.likes = extractStat(/left\s+green-text[^>]*>[\s\S]*?([\d,]+)/);
        }
        let status = "";
        const cm = raw.match(/<div class="chip[^>]*>([^<]+)/g);
        if (cm) {
          for (const c of cm) {
            const t = c.replace(/<[^>]+>/g, "").trim();
            if (["连载中", "已完结", "已弃坑"].includes(t)) status = t;
          }
        }
        let updateTime = "";
        const tm = raw.match(/(\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日)|(\d+\s*(?:小时|分钟|天)前)|(\d{1,2}\s*月\s*\d{1,2}\s*日)/);
        if (tm) updateTime = tm[0].replace(/\s/g, "");
        items.push({ id, title, author, cover, tags: [...new Set(tags)].slice(0, 8), status, stats, updateTime });
      }
      return items;
    } catch (e) {
      debugLog(`Search fallback failed: ${e.message}`);
      return [];
    }
  }, "searchThreads");
  return { fetchThread, fetchRandomId, searchThreads };
}
__name(createApi, "createApi");

// src/renderer.ts
var ICONS = {
  views: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>',
  comments: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>',
  likes: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>',
  followers: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>',
  hp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>',
  words: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z"/></svg>'
};
function createRenderer(ctx, config, logger, debugLog) {
  const renderCard = /* @__PURE__ */ __name(async (info, parent) => {
    debugLog(`Rendering Card for ID: ${info.ID}`);
    const isChapter = info.IsChapter || !!parent && parent.ID !== info.ID;
    const displayTitle = isChapter && parent ? parent.Title : info.Title;
    let displayCover = info.Background || extractImage(info.Content);
    if (!displayCover && parent) {
      displayCover = parent.Background;
      if (!displayCover && parent.Content) displayCover = extractImage(parent.Content);
    }
    const displayTagsObj = isChapter && parent ? parent.Tags : info.Tags;
    const subTitle = isChapter ? info.Title : null;
    const bgStyle = displayCover ? `background-image: url('${displayCover}');` : `background: ${generateGradient(displayTitle)};`;
    let summary = summarizeHtml(info.Content);
    if (stripHtml(summary).length < 10 && parent && isChapter) {
      summary = summarizeHtml(parent.Content);
    }
    if (!stripHtml(summary)) summary = "暂无简介";
    const tagsArr = [];
    if (displayTagsObj?.Type) tagsArr.push(displayTagsObj.Type);
    if (displayTagsObj?.Rating && displayTagsObj.Rating !== "E") tagsArr.push(displayTagsObj.Rating);
    if (displayTagsObj?.OtherTags) tagsArr.push(...displayTagsObj.OtherTags);
    const likes = Math.max(info.Upvotes || 0, parent?.Upvotes || 0);
    const wordCount = Math.max(info.WordCount || 0, parent?.WordCount || 0);
    const followers = Math.max(info.Followers || 0, parent?.Followers || 0);
    const highPraise = Math.max(info.HighPraise || 0, parent?.HighPraise || 0);
    const isAlbum = tagsArr.includes("图") || tagsArr.includes("漫画") || tagsArr.includes("画册") || tagsArr.includes("图楼") || tagsArr.includes("漫画或画册");
    const currentImgMatches = (info.Content || "").match(/<img[^>]+src\s*=\s*["']([^"']+)["']/gi) || [];
    const currentImgs = currentImgMatches.map((tag) => {
      const m = tag.match(/src\s*=\s*["']([^"']+)["']/i);
      return m ? m[1] : "";
    }).filter(Boolean);
    const hasImages = currentImgs.length > 0;
    const albumImgs = currentImgs.slice(0, 2);
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
        .summary { font-size: 14px; color: #546e7a; line-height: 1.7; display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden; text-align: left; }
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
            ${!displayCover ? `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.9);font-size:110px;font-family:'Segoe UI', system-ui, sans-serif;font-weight:800;letter-spacing:-2px;user-select:none;text-shadow:0 4px 15px rgba(0,0,0,0.15);">${(displayTitle.match(/[\w\u4e00-\u9fa5]/)?.[0] || displayTitle.charAt(0)).toUpperCase()}</div>` : ""}
            <div class="id-badge-container">
                <div class="id-label">ID</div>
                <div class="id-val">${info.ID}</div>
            </div>
        </div>
        <div class="info">
          <div class="header-group"><div class="title">${displayTitle}</div>${subTitle ? `<div class="subtitle">${subTitle}</div>` : ""}<div class="author">@${info.UserName}</div></div>
          <div class="tags">${tagsArr.slice(0, 10).map((t) => `<span class="tag">${t}</span>`).join("")}</div>
          <div class="summary-box">${isAlbum && hasImages ? `<div class="album-grid">${albumImgs.map((src) => `<img src="${src}"/>`).join("")}</div><div class="album-label">🖼️ 当前章节包含 ${currentImgs.length} 幅图</div>` : `<div class="summary">${summary}</div>`}</div>
          <div class="footer">
            <span class="stat" style="color:#6ea2d5">${ICONS.views}<span>${info.Views || 0}</span></span>
            <span class="stat" style="color:#8b6bb5">${ICONS.comments}<span>${info.Comments || 0}</span></span>
            <span class="stat" style="color:#72ae76">${ICONS.likes}<span>${likes}</span></span>
            <span class="stat" style="color:#5c9ec8">${ICONS.followers}<span>${followers}</span></span>
            <span class="stat" style="color:#d4a24d">${ICONS.hp}<span>${highPraise}</span></span>
            <span class="stat" style="color:#8f7970">${isAlbum ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>' : ICONS.words}<span>${isAlbum ? wordCount + " P" : wordCount}</span></span>
          </div></div></div></body></html>`;
    const page = await ctx.puppeteer.page();
    try {
      await injectCookies(page, config.cookies);
      await page.setContent(html);
      await page.setViewport({ width: 660, height: 480, deviceScaleFactor: 3 });
      const img = await page.$(".card").then((e) => e.screenshot({ type: "jpeg", quality: 100 }));
      return img;
    } finally {
      await page.close();
    }
  }, "renderCard");
  const renderSearchResults = /* @__PURE__ */ __name(async (keyword, results) => {
    debugLog(`Rendering search results: ${results.length} items`);
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
        .type-badge { display: inline-block; padding: 0 4px; border-radius: 3px; font-size: 9px; font-weight: bold; color: #fff; margin-right: 4px; line-height: 16px; vertical-align: middle; }
        .type-badge.tb-pic { background: #FFA726; }
        .type-badge.tb-repost { background: #42A5F5; }
        .type-badge.tb-long { background: #5C6BC0; }
        .type-badge.tb-t { background: #FF7043; }
      </style></head><body><div class="container"><div class="header"><div class="header-title">🔍 "${keyword}"</div><div>Top ${results.length}</div></div><div class="list">
          ${results.map((r) => {
      const typeBadges = [];
      if (r.tags.includes("图")) typeBadges.push('<span class="type-badge tb-pic">🖼️ 图</span>');
      if (r.tags.includes("转")) typeBadges.push('<span class="type-badge tb-repost">转</span>');
      if (r.tags.includes("长")) typeBadges.push('<span class="type-badge tb-long">长</span>');
      if (r.tags.includes("T")) typeBadges.push('<span class="type-badge tb-t">T</span>');
      const displayTags = r.tags.filter((t) => !["图", "转", "长", "T"].includes(t));
      const wordsIcon = r.stats.words.includes("P") ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>' : ICONS.words;
      const bg = r.cover ? `<img class="cover-img" src="${r.cover}"/>` : `<div style="width:100%;height:100%;background:${generateGradient(r.title)};display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.95);font-size:38px;font-family:'Segoe UI', system-ui, sans-serif;font-weight:800;letter-spacing:-1px;text-shadow:0 2px 8px rgba(0,0,0,0.1);">${(r.title.match(/[\w\u4e00-\u9fa5]/)?.[0] || r.title.charAt(0)).toUpperCase()}</div>`;
      return `<div class="item"><div class="cover-box">${bg}</div><div class="content">
              <div class="top-row"><div class="title">${r.title}</div>
                <div class="id-badge">
                    <div class="id-label">ID</div>
                    <div class="id-val">${r.id}</div>
                </div>
              </div>
              <div class="author">${typeBadges.join("")}By ${r.author} ${r.status ? ` · ${r.status}` : ""}</div>
              <div class="tags">${displayTags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
              <div class="meta-row">
                <span class="stat" style="color:#6ea2d5">${ICONS.views}<span>${r.stats.views}</span></span>
                <span class="stat" style="color:#8b6bb5">${ICONS.comments}<span>${r.stats.comments}</span></span>
                <span class="stat" style="color:#72ae76">${ICONS.likes}<span>${r.stats.likes}</span></span>
                <span class="stat" style="color:#d4a24d">${ICONS.hp}<span>${r.stats.followers || 0}</span></span>
                <span class="stat" style="color:#8f7970">${wordsIcon}<span>${r.stats.words}</span></span>
                <span style="margin-left:auto;color:#a0aab0;">${r.updateTime}</span>
              </div>
            </div></div>`;
    }).join("")}
        </div></div></body></html>`;
    const page = await ctx.puppeteer.page();
    try {
      await page.setContent(html);
      await page.setViewport({ width: 550, height: 800, deviceScaleFactor: 3 });
      const img = await page.$(".container").then((e) => e.screenshot({ type: "jpeg", quality: 100 }));
      return img;
    } finally {
      await page.close();
    }
  }, "renderSearchResults");
  const renderReadPages = /* @__PURE__ */ __name(async (info) => {
    debugLog(`Rendering read pages for ${info.ID} (${info.Title})`);
    const tagsArr = [];
    if (info.Tags?.Type) tagsArr.push(info.Tags.Type);
    if (info.Tags?.OtherTags) tagsArr.push(...info.Tags.OtherTags);
    const isAlbum = tagsArr.includes("图") || tagsArr.includes("漫画") || tagsArr.includes("画册") || tagsArr.includes("图楼") || tagsArr.includes("漫画或画册");
    let rawContent = info.Content || "";
    let extraImages = [];
    if (isAlbum) {
      const imgMatches = rawContent.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/gi) || [];
      extraImages = imgMatches.map((tag) => {
        const m = tag.match(/src\s*=\s*["']([^"']+)["']/i);
        return m ? m[1] : "";
      }).filter(Boolean);
      rawContent = rawContent.replace(/<img[^>]*>/gi, "");
      rawContent = rawContent.replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, "");
    }
    const content = cleanContent(rawContent);
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
      <div class="fixed-footer" id="page-indicator">- 1 -</div></body></html>`;
    const page = await ctx.puppeteer.page();
    try {
      await injectCookies(page, config.cookies);
      await page.setContent(html);
      await page.setViewport({ width: config.deviceWidth, height: config.deviceHeight, deviceScaleFactor: 3 });
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
      const strippedText = stripHtml(content);
      if (!isAlbum || strippedText.length > 5) {
        for (let i = 0; i < finalPages; i++) {
          await page.evaluate((idx, stepPx, curr, total) => {
            const offset = -(idx * stepPx);
            document.getElementById("content-scroller").style.transform = `translateX(${offset}px)`;
            document.getElementById("page-indicator").innerText = `- ${curr} / ${total} -`;
          }, i, step, i + 1, finalPages);
          imgs.push(await page.screenshot({ type: "jpeg", quality: 100 }));
        }
      }
      return { pages: imgs, extraImages };
    } catch (e) {
      logger.error("Error rendering read pages:", e);
      throw e;
    } finally {
      await page.close();
    }
  }, "renderReadPages");
  return { renderCard, renderSearchResults, renderReadPages };
}
__name(createRenderer, "createRenderer");

// src/commands.ts
var import_koishi = require("koishi");
function registerCommands(ctx, config, logger, debugLog, api, renderer) {
  const { fetchThread, fetchRandomId, searchThreads } = api;
  const { renderCard, renderSearchResults, renderReadPages } = renderer;
  ctx.command("ft.info <threadId:string>", "预览作品").action(async ({ session }, threadId) => {
    debugLog(`CMD ft.info triggered by ${session.userId} for ID: ${threadId}`);
    if (!threadId) return "请输入ID";
    const res = await fetchThread(threadId);
    if (!res.valid) return `[错误] ${res.msg}`;
    return session.send(import_koishi.h.image(await renderCard(res.data, res.parent), "image/jpeg"));
  });
  ctx.command("ft.read <threadId:string>", "阅读章节").action(async ({ session }, threadId) => {
    debugLog(`CMD ft.read triggered by ${session.userId} for ID: ${threadId}`);
    if (!threadId) return "请输入ID";
    const res = await fetchThread(threadId);
    if (!res.valid) return `[错误] 读取失败: ${res.msg}`;
    await session.send(`[加载中] ${res.data.Title}...`);
    try {
      const cardImg = await renderCard(res.data, res.parent);
      await session.send(import_koishi.h.image(cardImg, "image/jpeg"));
      const { pages, extraImages } = await renderReadPages(res.data);
      const nodes = pages.map((buf) => (0, import_koishi.h)("message", import_koishi.h.image(buf, "image/jpeg")));
      if (extraImages && extraImages.length > 0) {
        for (const imgUrl of extraImages) {
          nodes.push((0, import_koishi.h)("message", import_koishi.h.image(imgUrl)));
        }
        nodes.push((0, import_koishi.h)("message", import_koishi.h.text(`以上为本段落包含的 ${extraImages.length} 张原图`)));
      }
      const navs = [];
      const mainId = res.parent ? res.parent.ID : res.data.ID;
      navs.push(`[首页] /ft.read ${mainId}`);
      if (res.menu?.length) {
        const idx = res.menu.findIndex((m) => m.ID.toString() === threadId);
        if (idx > 0) navs.push(`[上一章] /ft.read ${res.menu[idx - 1].ID}`);
        if (idx < res.menu.length - 1) navs.push(`[下一章] /ft.read ${res.menu[idx + 1].ID}`);
      }
      if (navs.length) nodes.push((0, import_koishi.h)("message", import_koishi.h.text("章节导航:\n" + navs.join("\n"))));
      return session.send((0, import_koishi.h)("message", { forward: true }, nodes));
    } catch (e) {
      logger.error("ft.read rendering failed:", e);
      return "[错误] 渲染失败";
    }
  });
  ctx.command("ft.random", "随机作品").action(async ({ session }) => {
    debugLog(`CMD ft.random triggered by ${session.userId}`);
    const id = await fetchRandomId();
    if (!id) return "[错误] 获取失败";
    const res = await fetchThread(id);
    if (!res.valid) return `[错误] ID:${id} 读取失败`;
    await session.send(import_koishi.h.image(await renderCard(res.data, res.parent), "image/jpeg"));
    return `Tip: 发送 /ft.read ${res.data.ID} 阅读全文`;
  });
  ctx.command("ft.search <keyword:text>", "搜索作品").action(async ({ session }, keyword) => {
    debugLog(`CMD ft.search triggered by ${session.userId} for "${keyword}"`);
    if (!keyword) return "请输入关键词";
    await session.send("[加载中] 搜索中...");
    const results = await searchThreads(keyword);
    if (!results.length) return "未找到结果。";
    await session.send(import_koishi.h.image(await renderSearchResults(keyword, results), "image/jpeg"));
    const exampleId = results[0]?.id || "12345";
    return `Tip: 发送 /ft.read [ID] 阅读 (例: /ft.read ${exampleId})`;
  });
  ctx.command("ft.sub <threadId:string>", "订阅").action(async ({ session }, threadId) => {
    debugLog(`CMD ft.sub triggered by ${session.userId} for ID: ${threadId}`);
    if (!/^\d+$/.test(threadId)) return "ID错误";
    const exist = await ctx.database.get("fimtale_subs", { cid: session.cid, threadId });
    if (exist.length) return "已订阅";
    const res = await fetchThread(threadId);
    if (!res.valid) return "帖子不存在";
    await ctx.database.create("fimtale_subs", { cid: session.cid, threadId, lastCount: res.data.Comments, lastCheck: Date.now() });
    await session.send("[成功] 订阅成功");
    return session.send(import_koishi.h.image(await renderCard(res.data, res.parent), "image/jpeg"));
  });
  ctx.command("ft.unsub <threadId:string>", "退订").action(async ({ session }, threadId) => {
    debugLog(`CMD ft.unsub triggered by ${session.userId} for ID: ${threadId}`);
    const res = await ctx.database.remove("fimtale_subs", { cid: session.cid, threadId });
    return res.matched ? "[成功] 已退订" : "未找到订阅";
  });
  ctx.middleware(async (session, next) => {
    if (!config.autoParseLink) return next();
    const matches = [...session.content.matchAll(/fimtale\.(?:com|net)\/t\/(\d+)/g)];
    if (matches.length === 0) return next();
    debugLog(`Middleware matched link in channel ${session.channelId}`);
    const uniqueIds = [...new Set(matches.map((m) => m[1]))];
    if (session.userId === session.selfId) return next();
    const messageNodes = [];
    for (const id of uniqueIds) {
      try {
        const res = await fetchThread(id);
        if (res.valid) {
          const img = await renderCard(res.data, res.parent);
          messageNodes.push((0, import_koishi.h)("message", import_koishi.h.image(img, "image/jpeg")));
        }
      } catch (e) {
        logger.error(`Middleware failed to process link ${id}:`, e);
      }
    }
    if (messageNodes.length === 0) return next();
    if (messageNodes.length === 1) {
      return session.send(messageNodes[0].children);
    } else {
      return session.send((0, import_koishi.h)("message", { forward: true }, messageNodes));
    }
  });
  ctx.setInterval(async () => {
    const subs = await ctx.database.get("fimtale_subs", {});
    if (!subs.length) return;
    debugLog(`Polling check started for ${subs.length} subscriptions.`);
    const tids = [...new Set(subs.map((s) => s.threadId))];
    for (const tid of tids) {
      const res = await fetchThread(tid);
      if (!res.valid) continue;
      const targets = subs.filter((s) => s.threadId === tid && s.lastCount < res.data.Comments);
      if (targets.length) {
        debugLog(`Update found for thread ${tid} (Old: ${targets[0].lastCount}, New: ${res.data.Comments})`);
        const msg = `[更新] ${res.data.Title} 更新了！
回复: ${res.data.Comments}
https://fimtale.com/t/${tid}`;
        for (const sub of targets) {
          try {
            await ctx.broadcast([sub.cid], import_koishi.h.parse(msg));
            await ctx.database.set("fimtale_subs", { id: sub.id }, { lastCount: res.data.Comments });
          } catch (e) {
            logger.error(`Broadcast failed for sub ${sub.id}:`, e);
          }
        }
      }
    }
  }, config.pollInterval);
}
__name(registerCommands, "registerCommands");

// src/index.ts
var name = "fimtale-api";
var inject = ["puppeteer", "database", "http"];
var Config = import_koishi2.Schema.object({
  apiUrl: import_koishi2.Schema.string().default("https://fimtale.com/api/v1").description("Fimtale API 基础路径"),
  apiKey: import_koishi2.Schema.string().role("secret").required().description("API Key (必填)"),
  apiPass: import_koishi2.Schema.string().role("secret").required().description("API Pass (必填)"),
  cookies: import_koishi2.Schema.string().role("secret").description("浏览器 Cookie (用于解除安全模式)"),
  pollInterval: import_koishi2.Schema.number().default(60 * 1e3).description("追更轮询间隔(ms)"),
  autoParseLink: import_koishi2.Schema.boolean().default(true).description("自动解析链接为预览卡片"),
  deviceWidth: import_koishi2.Schema.number().default(390).description("阅读器渲染宽度(px)"),
  deviceHeight: import_koishi2.Schema.number().default(844).description("阅读器渲染高度(px)"),
  fontSize: import_koishi2.Schema.number().default(20).description("正文字号(px)"),
  debug: import_koishi2.Schema.boolean().default(false).description("开启详细调试日志"),
  enableFallback: import_koishi2.Schema.boolean().default(true).description("API失败时尝试直接爬取网页(降级策略)")
});
function apply(ctx, config) {
  const logger = ctx.logger("fimtale");
  const debugLog = /* @__PURE__ */ __name((msg, ...args) => {
    if (config.debug) {
      logger.info(`[DEBUG] ${msg}`, ...args);
    }
  }, "debugLog");
  ctx.model.extend("fimtale_subs", {
    id: "unsigned",
    cid: "string",
    threadId: "string",
    lastCount: "integer",
    lastCheck: "integer"
  }, { primary: "id", autoInc: true });
  const api = createApi(ctx, config, logger, debugLog);
  const renderer = createRenderer(ctx, config, logger, debugLog);
  registerCommands(ctx, config, logger, debugLog, api, renderer);
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name
});
