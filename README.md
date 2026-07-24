# MD2IMG

一款完全免费、本地优先的 Markdown 转图片工具。无需登录，没有次数限制，导出图片不带水印。

## 功能

- GitHub Flavored Markdown、代码高亮、KaTeX 数学公式和 Mermaid 图表
- 八套原创主题、自定义字体、背景、画布尺寸和作用域内自定义 CSS
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

- 默认 GA4 Measurement ID：`G-C3YEYVPEBR`
- 默认百度统计站点 ID：`8864588cde35a2181784b07b34f770f9`
- 自定义事件：`export_completed`，只包含导出格式、倍率和分片数量

如需为本站拆分独立数据流，可在构建时设置：

```bash
VITE_GOOGLE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_BAIDU_ANALYTICS_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

同一 ID 适合把多个个人站点放进统一看板，并可通过 hostname 区分；如果要独立观察获客、转化和留存，建议为每个域名创建单独的数据流或站点 ID。

## 隐私

MD2IMG 没有内容服务器。Markdown、本地图片、字体、文件名和导出文件不会上传。生产站点会向 Google Analytics 与百度统计发送页面访问和不含内容的导出事件；使用远程图片链接时，浏览器会直接向图片原地址发起请求。

## English

MD2IMG is a free, local-first Markdown-to-image studio. It supports rich Markdown, math, diagrams, themes, local assets, and watermark-free exports. Run `npm install && npm run dev` to start.

## License

[MIT](./LICENSE)
