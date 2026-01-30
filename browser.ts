/**
 * 浏览器管理模块
 * 提供 Puppeteer 浏览器的启动、配置和关闭功能
 */

import puppeteer, {
  type Browser,
  type LaunchOptions,
  type Page,
} from "puppeteer";

export interface BrowserConfig {
  /** 浏览器可执行路径，默认自动检测 */
  executablePath?: string;
  /** 是否 headless 模式，默认 true */
  headless?: boolean;
  /** 视口宽度，默认 1280 */
  width?: number;
  /** 视口高度，默认 800 */
  height?: number;
  /** User-Agent 列表，随机选择一个 */
  userAgents?: string[];
  /** 是否注入 stealth 脚本隐藏自动化特征，默认 true */
  stealth?: boolean;
  /** Stealth 脚本 URL */
  stealthUrl?: string;
  /** 页面超时时间（毫秒），默认 30000 */
  timeout?: number;
}

const defaultConfig: Required<Omit<BrowserConfig, "executablePath">> = {
  headless: true,
  width: 1280,
  height: 800,
  userAgents: [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0",
  ],
  stealth: true,
  stealthUrl:
    "https://raw.githubusercontent.com/requireCool/stealth.min.js/main/stealth.min.js",
  timeout: 30000,
};

let browser: Browser | null = null;
let stealthScript: string | null = null;

/**
 * 获取或初始化 stealth 脚本
 */
async function getStealthScript(url: string): Promise<string> {
  if (stealthScript === null) {
    const resp = await fetch(url);
    stealthScript = await resp.text();
  }
  return stealthScript;
}

/**
 * 创建并配置一个新的浏览器实例
 * @param config - 浏览器配置选项
 * @returns 配置好的浏览器实例和新页面
 */
export async function createBrowser(
  config: BrowserConfig = {},
): Promise<{ browser: Browser; page: Page }> {
  const mergedConfig: Required<Omit<BrowserConfig, "executablePath">> = {
    ...defaultConfig,
    ...config,
    userAgents: config.userAgents ?? defaultConfig.userAgents,
  };

  // 启动浏览器
  const launchOptions: LaunchOptions = {
    headless: mergedConfig.headless,
    args: [
      `--window-size=${mergedConfig.width},${mergedConfig.height}`,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  };

  if (config.executablePath) {
    launchOptions.executablePath = config.executablePath;
  }

  const instance = await puppeteer.launch(launchOptions);

  // 创建新页面
  const page = await instance.newPage();

  // 设置随机 User-Agent
  // 设置随机User-Agent
  await page.setUserAgent({
    userAgent: mergedConfig.userAgents[
      Math.floor(Math.random() * mergedConfig.userAgents.length)
    ] ?? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  });

  // 设置默认请求头
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const headers = request.headers();
    request.continue({
      headers: {
        ...headers,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "close",
      },
    });
  });

  // 注入 stealth 脚本
  if (mergedConfig.stealth) {
    const stealth = await getStealthScript(mergedConfig.stealthUrl);
    await page.addScriptTag({ content: stealth });
  }

  // 隐藏自动化特征
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => false,
    });
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });
  });

  return { browser: instance, page };
}

/**
 * 获取全局浏览器实例（单例模式）
 * 如果浏览器不存在则创建新实例
 * @param config - 浏览器配置选项
 * @returns 浏览器实例和新页面
 */
export async function getBrowser(
  config: BrowserConfig = {},
): Promise<{ browser: Browser; page: Page }> {
  if (browser === null || !browser.connected) {
    const result = await createBrowser(config);
    browser = result.browser;
    return result;
  }

  const page = await browser.newPage();
  return { browser, page };
}

/**
 * 创建一个新的页面
 * 如果浏览器不存在则先创建浏览器实例
 * @param config - 浏览器配置选项
 * @returns 新创建的页面
 */
export async function newPage(config: BrowserConfig = {}): Promise<Page> {
  const { page } = await getBrowser(config);
  return page;
}

/**
 * 关闭全局浏览器实例
 */
export async function closeBrowser(): Promise<void> {
  if (browser !== null) {
    await browser.close();
    browser = null;
  }
}

/**
 * 导航到指定 URL 并等待加载
 * @param page - Puppeteer 页面对象
 * @param url - 目标 URL
 * @param waitUntil - 加载策略，默认 "networkidle2"
 * @param timeout - 超时时间（毫秒）
 */
export async function navigateTo(
  page: Page,
  url: string,
  waitUntil:
    | "load"
    | "domcontentloaded"
    | "networkidle0"
    | "networkidle2" = "networkidle2",
  timeout?: number,
): Promise<void> {
  await page.goto(url, { waitUntil, timeout });
}

/**
 * 设置页面视口
 * @param page - Puppeteer 页面对象
 * @param width - 宽度
 * @param height - 高度
 */
export async function setViewport(
  page: Page,
  width: number,
  height: number,
): Promise<void> {
  await page.setViewport({ width, height });
}

export async function getRenderedHtml(
  url: string,
  config?: BrowserConfig,
): Promise<string> {
  const { page } = await getBrowser(config);
  await navigateTo(page, url);
  return page.content();
}
