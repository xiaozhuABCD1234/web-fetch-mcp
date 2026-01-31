/**
 * 网页抓取工具模块
 * 提供页面内容提取、元数据获取、页面类型检测等功能
 */

import * as cheerio from "cheerio";
import { getRenderedHtml } from "./browser.js";

/**
 * 页面基础信息（标题、链接、图片）
 */
export interface PageSummary {
  url: string;
  title: string;
  links: { title: string; href: string }[];
  images: { title: string; src: string }[];
  [key: string]: unknown;
}

/**
 * 页面元数据（SEO、Open Graph、Twitter 等）
 */
export interface PageMetadata {
  charset: string;
  title: string;
  description?: string;
  keywords?: string;
  author?: string;
  canonical?: string;
  robots?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  og_url?: string;
  og_type?: string;
  og_site_name?: string;
  twitter_card?: string;
  twitter_image?: string;
  next?: string;
  prev?: string;
  alternate?: string;
  [key: string]: unknown;
}

/**
 * 页面类型检测结果
 */
export interface PageTypeResult {
  isDynamic: boolean;
  confidence: number;
  hints: string[];
  framework?: string;
  [key: string]: unknown;
}

/**
 * 获取页面的摘要信息，包括标题、所有链接和图片
 * @param url - 要抓取的页面 URL
 * @param linkCount - 返回的链接数量上限，默认 10
 * @param imageCount - 返回的图片数量上限，默认 10
 * @returns 页面摘要对象，包含 url、title、links、images
 */
export async function fetchPageSummary(
  url: string,
  linkCount?: number,
  imageCount?: number,
): Promise<PageSummary> {
  const resp = await fetch(url);
  const html = await resp.text();
  const $ = cheerio.load(html);

  // 提取页面标题
  const title = $("title").text();

  // 提取所有链接
  const links: { title: string; href: string }[] = [];
  $("a").each((_, el) => {
    const href = $(el).attr("href");
    const title = $(el).attr("title") || $(el).text().trim();
    if (href) links.push({ title, href });
  });

  // 提取所有图片
  const images: { title: string; src: string }[] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src");
    const title = $(el).attr("alt") || $(el).attr("title") || "";
    if (src) images.push({ title, src });
  });

  return {
    url,
    title,
    links: linkCount ? links.slice(0, linkCount) : links.slice(0, 10),
    images: imageCount ? images.slice(0, imageCount) : images.slice(0, 10),
  };
}

/**
 * 获取页面的元数据信息
 * 包括字符集、SEO 信息、Open Graph、Twitter Card 等
 * @param url - 要抓取的页面 URL
 * @returns 页面元数据对象
 */
export async function fetchPageMetadata(url: string): Promise<PageMetadata> {
  const resp = await fetch(url);
  const html = await resp.text();
  const $ = cheerio.load(html);

  // 从 meta 标签提取 name
  const getMetaByName = (name: string): string | undefined => {
    return $(`meta[name="${name}"]`).attr("content") || undefined;
  };

  const getMetaByProperty = (prop: string): string | undefined => {
    return (
      $(`meta[property="${prop}"]`).attr("content") ||
      $(`meta[property="${prop}"]`).attr("href") ||
      undefined
    );
  };

  return {
    // 必要信息
    charset: $("meta[charset]").attr("charset") || "utf-8",
    title: $("title").text(),
    description: getMetaByName("description"),

    // SEO
    keywords: getMetaByName("keywords"),
    author: getMetaByName("author"),
    canonical: $('link[rel="canonical"]').attr("href") || undefined,
    robots: getMetaByName("robots"),

    // Open Graph
    og_title: getMetaByProperty("og:title"),
    og_description: getMetaByProperty("og:description"),
    og_image: getMetaByProperty("og:image"),
    og_url: getMetaByProperty("og:url"),
    og_type: getMetaByProperty("og:type"),
    og_site_name: getMetaByProperty("og:site_name"),

    // Twitter
    twitter_card: getMetaByProperty("twitter:card"),
    twitter_image: getMetaByProperty("twitter:image"),

    // 翻页和订阅
    next: $('link[rel="next"]').attr("href") || undefined,
    prev: $('link[rel="prev"]').attr("href") || undefined,
    alternate: $('link[rel="alternate"]').attr("href") || undefined,
  };
}

/**
 * 提取页面中所有链接的标题和地址
 * @param url - 要抓取的页面 URL
 * @param forceHeadless - 强制使用无头浏览器爬取，默认根据页面类型自动判断
 * @returns 链接数组，每个元素包含 title 和 href
 */
export async function fetchLinks(
  url: string,
  forceHeadless?: boolean,
): Promise<{ links: { title: string; href: string }[] }> {
  const resp = await fetch(url);
  const html = await resp.text();
  const pageType = detectPageType(html);
  const useHeadless = forceHeadless ?? pageType.isDynamic;
  const finalHtml = useHeadless ? await getRenderedHtml(url) : html;
  const $ = cheerio.load(finalHtml);

  const links: { title: string; href: string }[] = [];
  $("a").each((_, el) => {
    const href = $(el).attr("href");
    const title = $(el).attr("title") || $(el).text().trim();
    if (href) {
      links.push({ title, href });
    }
  });

  return { links };
}

/**
 * 提取页面的纯文本内容
 * @param url - 要抓取的页面 URL
 * @param forceHeadless - 强制使用无头浏览器爬取，默认根据页面类型自动判断
 * @returns 页面纯文本内容对象
 */
export async function fetchPageText(
  url: string,
  forceHeadless?: boolean,
): Promise<{ text: string }> {
  const resp = await fetch(url);
  const html = await resp.text();
  const pageType = detectPageType(html);
  const useHeadless = forceHeadless ?? pageType.isDynamic;
  const finalHtml = useHeadless ? await getRenderedHtml(url) : html;
  const $ = cheerio.load(finalHtml);

  const text = $("body").text();

  return {
    text: text
      // 解码常见转义序列
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      // 删除无意义的 window.__VP_ 变量赋值
      .replace(
        /window\.__VP_[A-Z_]+__\s*=\s*JSON\.parse\(["'][^"']+["']\);?/g,
        "",
      )
      // 清理多余空白
      .replace(/\s*\n\s*/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+/g, " ")
      .trim(),
  };
}

/**
 * 通过启发式规则检测网页是静态还是动态（SPA）
 * 通过检测挂载点、框架注水数据、HTML 标记等来判断页面类型
 * @param html - 网页的 HTML 内容
 * @returns 检测结果对象，包含 isDynamic、confidence、hints 和 framework
 */
export function detectPageType(html: string): PageTypeResult {
  const $ = cheerio.load(html);
  const hints: string[] = [];
  let score = 0;

  // 1. 检测典型挂载点
  const mountPoints = ["root", "app", "__next", "nuxt", "__nuxt", "__NEXT"];
  const hasMountPoint = mountPoints.some(
    (id) => $(`#${id}`).length > 0 || $(`[id*="${id}"]`).length > 0,
  );
  if (hasMountPoint) {
    score += 3;
    hints.push("存在 SPA 挂载点");
  }

  // 2. 检测注水数据
  const hydrationPatterns = [
    /__NEXT_DATA__/,
    /__NUXT__/,
    /__INITIAL_STATE__/,
    /__APOLLO_STATE__/,
    /__REDUX_STATE__/,
    /__VUE__/,
  ];
  const hydrationMatches = hydrationPatterns.filter((p) => p.test(html));
  if (hydrationMatches.length > 0) {
    score += hydrationMatches.length * 2;
    hints.push("存在框架注水数据");
  }

  // 3. 检测 React/Vue/Angular 标记
  if ($("[data-reactroot]").length > 0 || $("[data-reactid]").length > 0) {
    score += 2;
    hints.push("React 标记");
  }
  if ($("[data-server-rendered]").length > 0) {
    score += 1;
    hints.push("Vue SSR 标记");
  }
  if ($("[ng-version]").length > 0) {
    score += 1;
    hints.push(`Angular 版本: ${$("[ng-version]").attr("ng-version")}`);
  }

  // 4. 检测 meta generator
  const generator = $('meta[name="generator"]').attr("content") || "";
  const frameworkMatch = generator.match(
    /(Next\.js|Nuxt|Gatsby|Vite|Astro|SvelteKit|Remix)/i,
  );
  if (frameworkMatch) {
    score += 2;
    hints.push(`框架: ${frameworkMatch[1]}`);
  }

  // 5. 检测 body 文本与脚本比例
  const bodyText = $("body").text().trim();
  const scriptCount = $("script").length;
  const scriptTotalLength = $("script")
    .map((_, el) => $(el).html()?.length || 0)
    .get()
    .reduce((a, b) => a + b, 0);

  if (bodyText.length < 100 && scriptCount >= 3) {
    score += 2;
    hints.push("body 内容极少，脚本众多");
  }
  if (scriptTotalLength > 50000 && bodyText.length < 500) {
    score += 2;
    hints.push("脚本体积远大于 body 文本");
  }

  // 6. 检测 noscript 提示
  const noscript = $("noscript").text().toLowerCase();
  if (noscript.includes("javascript") && noscript.includes("enable")) {
    score += 1;
    hints.push("noscript 提示启用 JavaScript");
  }

  // 7. 检测空 body 或极简 body
  const bodyChildren = $("body").children().length;
  if (bodyChildren === 0 || (bodyChildren <= 2 && bodyText.length < 50)) {
    score += 3; // 空 body 是 SPA 的强特征
    hints.push("body 几乎为空");
  }

  // 计算置信度 (0-1)
  const confidence = Math.min(score / 10, 1);
  const isDynamic = confidence >= 0.3;

  // 提取框架名称
  const detectedFramework = frameworkMatch?.[1] ||
      hydrationMatches.find((p) => p.source.includes("NEXT"))
    ? "Next.js"
    : hydrationMatches.find((p) => p.source.includes("NUXT"))
    ? "Nuxt"
    : undefined;

  return {
    isDynamic,
    confidence: Math.round(confidence * 100) / 100,
    hints,
    framework: detectedFramework,
  };
}

// if (import.meta.path === Bun.main) {
//   const resp = await fetch(
//     "https://space.bilibili.com/151239202",
//   );
//   const html = await resp.text();
//   console.log(detectPageType(html));
// }
