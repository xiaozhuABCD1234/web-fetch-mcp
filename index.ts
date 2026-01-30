import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  fetchLinks,
  fetchPageMetadata,
  fetchPageSummary,
  fetchPageText,
} from "./web-scraper.js";

const server = new McpServer({
  version: "0.0.1",
  name: "web-fetch-mcp",
});

server.registerTool(
  "fetch_page_summary",
  {
    title: "网页摘要",
    description:
      "快速获取网页标题、主要链接和图片，便于了解页面整体结构和内容概览",
    inputSchema: {
      url: z.string().describe("目标网页 URL"),
      linkCount: z.number().optional().describe("返回链接数量上限，默认 10"),
      imageCount: z.number().optional().describe("返回图片数量上限，默认 10"),
    },
    outputSchema: {
      url: z.string(),
      title: z.string(),
      links: z.array(z.object({ title: z.string(), href: z.string() })),
      images: z.array(z.object({ title: z.string(), src: z.string() })),
    },
  },
  async (params: { url: string; linkCount?: number; imageCount?: number }) => {
    const result = await fetchPageSummary(
      params.url,
      params.linkCount,
      params.imageCount,
    );
    return {
      content: [{ type: "text", text: `标题: ${result.title}` }],
      structuredContent: result,
    };
  },
);

server.registerTool(
  "fetch_page_metadata",
  {
    title: "SEO 元数据",
    description:
      "提取网页的 SEO 标签和 Open Graph 社交媒体元数据，用于分析页面优化和分享预览",
    inputSchema: {
      url: z.string().describe("目标网页 URL"),
    },
    outputSchema: {
      charset: z.string(),
      title: z.string(),
      description: z.string().optional(),
      keywords: z.string().optional(),
      author: z.string().optional(),
      canonical: z.string().optional(),
      robots: z.string().optional(),
      og_title: z.string().optional(),
      og_description: z.string().optional(),
      og_image: z.string().optional(),
      og_url: z.string().optional(),
      og_type: z.string().optional(),
      og_site_name: z.string().optional(),
      twitter_card: z.string().optional(),
      twitter_image: z.string().optional(),
      next: z.string().optional(),
      prev: z.string().optional(),
      alternate: z.string().optional(),
    },
  },
  async (params: { url: string }) => {
    const result = await fetchPageMetadata(params.url);
    return {
      content: [{ type: "text", text: `标题: ${result.title}` }],
      structuredContent: result,
    };
  },
);

server.registerTool(
  "fetch_links",
  {
    title: "提取链接",
    description:
      "提取页面中所有超链接的标题和地址，用于发现页面导航结构和外部资源",
    inputSchema: {
      url: z.string().describe("目标网页 URL"),
    },
    outputSchema: {
      links: z.array(
        z.object({
          title: z.string(),
          href: z.string(),
        }),
      ),
    },
  },
  async (params: { url: string }) => {
    const result = await fetchLinks(params.url, false);
    return {
      content: [
        {
          type: "text",
          text: `共找到 ${result.links.length} 个链接`,
        },
      ],
      structuredContent: result,
    };
  },
);

server.registerTool(
  "fetch_links_headless",
  {
    title: "提取链接（强制无头）",
    description:
      "使用无头浏览器提取页面中所有超链接的标题和地址，用于处理动态渲染的页面",
    inputSchema: {
      url: z.string().describe("目标网页 URL"),
    },
    outputSchema: {
      links: z.array(
        z.object({
          title: z.string(),
          href: z.string(),
        }),
      ),
    },
  },
  async (params: { url: string }) => {
    const result = await fetchLinks(params.url, true);
    return {
      content: [
        {
          type: "text",
          text: `共找到 ${result.links.length} 个链接`,
        },
      ],
      structuredContent: result,
    };
  },
);

server.registerTool(
  "fetch_page_text",
  {
    title: "提取正文",
    description:
      "提取网页的主要文本内容（去除 HTML 标签），用于阅读或分析页面文字信息",
    inputSchema: {
      url: z.string().describe("目标网页 URL"),
    },
    outputSchema: {
      text: z.string(),
    },
  },
  async (params: { url: string }) => {
    const result = await fetchPageText(params.url, false);
    return {
      content: [
        {
          type: "text",
          text: result.text.slice(0, 200),
        },
      ],
      structuredContent: result,
    };
  },
);

server.registerTool(
  "fetch_page_text_headless",
  {
    title: "提取正文（强制无头）",
    description: "使用无头浏览器提取网页的主要文本内容，用于处理动态渲染的页面",
    inputSchema: {
      url: z.string().describe("目标网页 URL"),
    },
    outputSchema: {
      text: z.string(),
    },
  },
  async (params: { url: string }) => {
    const result = await fetchPageText(params.url, true);
    return {
      content: [
        {
          type: "text",
          text: result.text.slice(0, 200),
        },
      ],
      structuredContent: result,
    };
  },
);

if (import.meta.path === Bun.main) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
