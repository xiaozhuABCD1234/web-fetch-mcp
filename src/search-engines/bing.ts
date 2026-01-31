import type { Page } from "puppeteer";

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  content: string;
}

/**
 * 解码 Bing 搜索结果中的重定向 URL
 */
function decodeBingUrl(url: string): string {
  try {
    const u = new URLSearchParams(url);
    const raw = u.get("u");
    if (!raw) {
      return url;
    }
    return atob(raw.replace(/^a1/, "").replace(/_/g, "/").replace(/-/g, "+"));
  } catch {
    return url;
  }
}

/**
 * 在 Bing 搜索页面中提取搜索结果
 * @param page - 已加载 Bing 搜索结果页面的 Puppeteer Page 对象
 * @param query - 搜索关键词
 * @returns 搜索结果数组
 */
export async function searchBing(
  page: Page,
  query: string,
): Promise<SearchResult[]> {
  // 访问 Bing 搜索页面
  await page.goto(
    `https://www.bing.com/search?form=QBLH&q=${encodeURIComponent(query)}`,
    {
      waitUntil: "networkidle2",
      timeout: 30000,
    },
  );

  // 等待搜索结果容器加载出来
  await page.waitForSelector("#b_results", { timeout: 10000 });

  // 提取搜索结果
  const results = await page.$$eval("li.b_algo", (lis) => {
    return lis
      .map((li) => {
        const title = li.querySelector("h2")?.textContent || "";
        const url = li.querySelector("a")?.href || "";
        const description = li.querySelector("h2+*")?.textContent || "";

        return {
          title,
          url,
          description,
          content: `${title}\n${description}`,
        };
      })
      .filter((result) => result.title && result.url);
  });

  // 解码所有结果中的 URL
  return results.map((result) => ({
    ...result,
    url: decodeBingUrl(result.url),
  }));
}
