const { join } = require("path");

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // 更改 Puppeteer 的缓存目录
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
  // 或者直接指定绝对路径
  // cacheDirectory: '/your/custom/path/here',
};
