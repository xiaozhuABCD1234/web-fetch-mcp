import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { _fetch, _fetch_meta } from "./fetch.js";

const server = new McpServer({
  version: "0.0.1",
  name: "web-fetch-mcp",
});

server.registerTool(
  "calculate-bmi",
  {
    title: "BMI Calculator",
    description: "Calculate Body Mass Index",
    inputSchema: {
      weightKg: z.number(),
      heightM: z.number(),
    },
    outputSchema: { bmi: z.number() },
  },
  async ({ weightKg, heightM }) => {
    const output = { bmi: weightKg / (heightM * heightM) };
    return {
      content: [{ type: "text", text: JSON.stringify(output) }],
      structuredContent: output,
    };
  },
);

server.registerTool(
  "add",
  {
    title: "加法计算器",
    description: "将两个数字相加并返回计算结果",
    inputSchema: {
      a: z.number().describe("第一个数字"),
      b: z.number().describe("第二个数字"),
    },
    outputSchema: {
      sum: z.number().describe("两数之和"),
    },
  },
  async (params: { a: number; b: number }) => {
    const sum = params.a + params.b;
    return {
      content: [{ type: "text", text: `${params.a} + ${params.b} = ${sum}` }],
      structuredContent: { sum },
    };
  },
);

server.registerTool(
  "web_fetch",
  {
    title: "网页抓取",
    description: "抓取网页内容，提取标题、链接和图片",
    inputSchema: {
      url: z.string().describe("要抓取的网页 URL"),
    },
    outputSchema: {
      url: z.string(),
      title: z.string(),
      links: z.array(z.string()),
      images: z.array(z.string()),
    },
  },
  async (params: { url: string }) => {
    const result = await _fetch(params.url);
    return {
      content: [{ type: "text", text: `标题: ${result.title}` }],
      structuredContent: result,
    };
  },
);

server.registerTool(
  "web_fetch_meta",
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
    const result = await _fetch_meta(params.url);
    return {
      content: [{ type: "text", text: `标题: ${result.title}` }],
      structuredContent: result,
    };
  },
);

if (import.meta.path === Bun.main) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
