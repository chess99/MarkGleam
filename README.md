# MD2IMG

一款完全免费、本地优先的 Markdown 转图片工具。无需登录，没有次数限制，导出图片不带水印。

## 功能

- GitHub Flavored Markdown、代码高亮、KaTeX 数学公式和 Mermaid 图表
- 八套原创内容主题、独立界面明暗模式、自定义字体、背景、画布尺寸和作用域内自定义 CSS
- PNG、JPEG、WebP、SVG、PDF、剪贴板和长图分片 ZIP
- Markdown 文件、图片拖放导入和浏览器本地自动保存
- 中文与英文界面、桌面三栏工作台和移动端模式切换
- 所有内容和导出均在浏览器本地处理

## 本地开发

需要 Node.js 22 或更新版本。

```bash
npm install
npm run dev
```

常用检查：

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

首次运行端到端测试前，需要安装 Playwright 浏览器：

```bash
npx playwright install chromium firefox webkit
```

端到端测试使用独占端口启动本地服务，不会复用其他项目的开发服务器。正式发布前的测试范围、人工体验结果和剩余风险记录在 [发布质量审计](./docs/release-quality-audit.md)。GitHub Pages 工作流也会在部署前运行 Chromium 端到端测试。

## 浏览器限制

- 复制图片依赖 `ClipboardItem` 和安全上下文，不支持时会自动下载 PNG。
- 远程图片受原站 CORS 策略约束。将图片下载到本地后拖入编辑器最可靠。
- 超长图片可能超过浏览器画布上限，MD2IMG 会自动改为分片 ZIP。
- 本地上传的图片和字体保存在 IndexedDB；Markdown 与设置保存在 localStorage。

## GitHub Pages 部署

仓库内置 GitHub Actions 工作流。创建公开仓库并推送 `main` 分支后，在 GitHub 仓库的 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。

Vite 使用相对资源路径，可同时运行在：

- `https://chess99.github.io/markdown-to-image/`
- `https://md2img.cearl.cc/`（当前 canonical 与 sitemap 地址）

仓库不包含 `CNAME` 文件。自定义域名由 GitHub Pages 与 DNS 后台配置。

## 访问统计

生产环境会在页面加载完成后的浏览器空闲时段接入 Google Analytics 4 与百度统计，本地开发和 `127.0.0.1` 预览不会上报。

- 默认 GA4 Measurement ID：`G-XRTY7G7G3Y`
- 默认百度统计站点 ID：`771a2878fa58bca1d5d31f597f9315be`
- 自定义事件：`export_completed`，只包含导出格式、倍率和分片数量

如需在其他部署环境覆盖默认统计配置，可在构建时设置：

```bash
VITE_GOOGLE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_BAIDU_ANALYTICS_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

本站默认使用 `md2img.cearl.cc` 的独立数据流与站点 ID，避免和其他域名的数据混在一起。

## 隐私

MD2IMG 没有内容服务器。Markdown、本地图片、字体、文件名和导出文件不会上传。生产站点会向 Google Analytics 与百度统计发送页面访问和不含内容的导出事件；使用远程图片链接时，浏览器会直接向图片原地址发起请求。

## PDF 与打印

- **保留样式 PDF**：把主题预览按页生成图片型 PDF，适合分享和保留视觉效果；文字会转为图片。
- **打印 / 可搜索 PDF**：使用浏览器原生分页，默认采用白底、11pt 正文和省墨配色；文字可搜索、复制，可直接选择打印机或另存为 PDF。
- “100 页以上优先快速导出”仅影响保留样式 PDF：开启后会适度降低清晰度以显著缩短耗时、减小文件，关闭后严格使用所选清晰度和图片质量；100 页以下不受影响。
- A4/Letter、纵向/横向、页边距和 `<!-- pagebreak -->` 同时适用于两种模式；`---` 始终是普通水平分隔线。
- 更新记录可从帮助菜单打开，也可直接访问 `#/changelog`。

打印实现、浏览器行为和已知边界见 [打印工作流说明](./docs/printing.md)。

## English

MD2IMG is a free, local-first Markdown-to-image studio. It supports rich Markdown, math, diagrams, themes, local assets, and watermark-free exports. Run `npm install && npm run dev` to start.

## License

[MIT](./LICENSE)
