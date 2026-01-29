import * as cheerio from "cheerio";

async function _fetch(url: string) {
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

async function _fetch_meta(url: string) {
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

export { _fetch, _fetch_meta };
