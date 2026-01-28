import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

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

if (import.meta.path === Bun.main) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
