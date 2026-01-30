# web-fetch-mcp

一个 Model Context Protocol (MCP) 服务器，为 AI
助手提供强大的网页抓取和搜索功能。

## 功能特性

- **网页抓取**：提取页面摘要、元数据、链接和文本内容
- **动态页面支持**：使用 Puppeteer 自动检测和渲染 SPA（单页应用）
- **SEO 元数据**：提取 Open Graph、Twitter Card 和传统 Meta 标签
- **网页搜索**：内置 Bing 搜索集成
- **智能检测**：自动判断页面是否需要无头浏览器渲染

## 工具列表

| 工具                       | 描述                                     |
| -------------------------- | ---------------------------------------- |
| `fetch_page_summary`       | 获取页面标题、链接和图片概览             |
| `fetch_page_metadata`      | 提取 SEO 标签和 Open Graph 元数据        |
| `fetch_links`              | 提取页面所有超链接                       |
| `fetch_links_headless`     | 使用无头浏览器提取链接（适用于动态页面） |
| `fetch_page_text`          | 提取页面主要文本内容                     |
| `fetch_page_text_headless` | 使用无头浏览器提取文本（适用于动态页面） |
| `search_web`               | 使用 Bing 搜索引擎搜索                   |

## 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/web-fetch-mcp.git
cd web-fetch-mcp

# 安装依赖
bun install
```

## 使用方法

### 作为 MCP 服务器运行

```bash
bun run index.ts
```

### Claude Desktop 集成

添加到 `claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "web-fetch": {
      "command": "bun",
      "args": ["run", "/path/to/web-fetch-mcp/index.ts"]
    }
  }
}
```

### 程序化使用

```typescript
import {
  fetchPageMetadata,
  fetchPageSummary,
  fetchPageText,
} from "./web-scraper.js";
import { searchWeb } from "./search.js";

// 获取页面摘要
const summary = await fetchPageSummary("https://example.com");
console.log(summary.title);

// 提取元数据
const metadata = await fetchPageMetadata("https://example.com");
console.log(metadata.description);

// 网页搜索
const results = await searchWeb("TypeScript 教程");
console.log(results);
```

## 项目结构

```text
web-fetch-mcp/
├── index.ts           # MCP 服务器入口
├── browser.ts         # Puppeteer 浏览器管理
├── web-scraper.ts     # 核心抓取工具
├── search.ts          # 网页搜索接口
└── search-engines/
    └── bing.ts        # Bing 搜索实现
```

### 核心模块

- **browser.ts**：管理 Puppeteer 浏览器实例，支持隐身模式和可配置选项
- **web-scraper.ts**：使用 Cheerio 进行 HTML 解析，包含 SPA 检测启发式算法
- **search.ts**：统一的搜索接口，支持多搜索引擎

## 环境要求

- [Bun](https://bun.sh/) 1.0+
- Node.js 18+（备用方案）
- Chromium/Chrome 浏览器（用于 Puppeteer）

## 环境变量

| 变量          | 描述                  | 默认值   |
| ------------- | --------------------- | -------- |
| `CHROME_PATH` | Chrome 可执行文件路径 | 自动检测 |

## 开源协议

MIT License - 详见 [LICENSE](LICENSE) 文件。
