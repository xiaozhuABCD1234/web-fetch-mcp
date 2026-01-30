import { getBrowser } from "./browser.js";
import { searchBing, type SearchResult } from "./search-engines/bing.js";

/**
 * 使用 Bing 搜索引擎搜索关键词
 * @param query - 搜索关键词
 * @returns 搜索结果数组
 */
export async function searchWeb(query: string): Promise<SearchResult[]> {
  const { page } = await getBrowser();
  return searchBing(page, query);
}
