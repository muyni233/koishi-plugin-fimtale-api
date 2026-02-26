import { Page } from 'puppeteer-core';
export declare const fontStack = "\"Noto Sans SC\", \"Microsoft YaHei\", \"PingFang SC\", sans-serif";
export declare const fontSerif = "\"Noto Serif SC\", \"Source Han Serif SC\", \"SimSun\", serif";
export declare const stripHtml: (html: string | null | undefined) => string;
/**
 * 为预览卡片生成保留基本 HTML 格式的摘要
 * 保留: p, br, b, strong, i, em, blockquote
 * 移除: img, script, style, iframe, div, span, 以及其他复杂标签
 */
export declare const summarizeHtml: (html: string | null | undefined, maxLen?: number) => string;
export declare const extractImage: (html: string | null | undefined) => string;
export declare const generateGradient: (str: string) => string;
export declare const cleanContent: (html: string) => string;
export declare const injectCookies: (page: Page, cookies: string | undefined) => Promise<void>;
