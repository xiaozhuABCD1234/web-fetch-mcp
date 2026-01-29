import * as cheerio from "cheerio";

export async function _fetch(url: string) {
  const resp = await fetch(url);
  const html = await resp.text();
  const $ = cheerio.load(html);

  // 提取页面标题
  const title = $("title").text();

  // 提取所有链接
  const links: string[] = [];
  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (href) links.push(href);
  });

  // 提取所有图片
  const images: string[] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src");
    if (src) images.push(src);
  });

  return {
    url,
    title,
    links: links.slice(0, 10), // 最多返回 10 个链接
    images: images.slice(0, 10), // 最多返回 10 个图片
  };
}

export async function _fetch_meta(url: string) {
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
 * 启发式判断网页类型：静态或动态
 * @param html - 网页 HTML 内容
 * @returns 页面类型信息
 */
interface PageTypeResult {
  isDynamic: boolean;
  confidence: number; // 0-1，越高越确定是动态
  hints: string[];
  framework?: string;
}

function detectPageType(html: string): PageTypeResult {
  const $ = cheerio.load(html);
  const hints: string[] = [];
  let score = 0;

  // 1. 检测典型挂载点
  const mountPoints = ["root", "app", "__next", "nuxt", "__nuxt", "__NEXT"];
  const hasMountPoint = mountPoints.some(
    (id) => $(`#${id}`).length > 0 || $(`[id*="${id}"]`).length > 0,
  );
  if (hasMountPoint) {
    score += 2;
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
    score += 1;
    hints.push("body 几乎为空");
  }

  // 计算置信度 (0-1)
  const confidence = Math.min(score / 10, 1);
  const isDynamic = confidence > 0.3;

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

if (import.meta.path === Bun.main) {
  const resp = await fetch(
    "https://www.bing.com/search?form=QBLH&q=%E7%9F%A5%E4%B9%8E",
  );
  const html = await resp.text();
  console.log(detectPageType(html));
}
