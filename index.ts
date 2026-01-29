import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  fetchLinks,
  fetchPageMetadata,
  fetchPageSummary,
} from "./web-scraper.js";

const server = new McpServer({
  version: "0.0.1",
  name: "web-fetch-mcp",
});

server.registerTool(
  "fetch_page_summary",
  {
    title: "网页抓取",
    description: "抓取网页内容，提取标题、链接和图片",
    inputSchema: {
      url: z.string().describe("要抓取的网页 URL"),
      linkCount: z.number().optional().describe("返回的链接数量上限，默认 10"),
      imageCount: z.number().optional().describe("返回的图片数量上限，默认 10"),
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
    title: "网页元数据",
    description: "提取网页的 SEO 和社交媒体元数据",
    inputSchema: {
      url: z.string().describe("要抓取的网页 URL"),
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
    title: "获取页面链接",
    description: "提取网页中所有链接的标题和地址",
    inputSchema: {
      url: z.string().describe("要抓取的网页 URL"),
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
    const result = await fetchLinks(params.url);
    return {
      content: [{ type: "text", text: `共找到 ${result.length} 个链接` }],
      structuredContent: { links: result },
    };
  },
);

if (import.meta.path === Bun.main) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
