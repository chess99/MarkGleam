# MD2IMG 关键词落地页与产品能力 Roadmap

更新时间：2026-07-30

状态：已实现，等待人工审查。16 个双语静态页面、对应工具模式、SEO 合约测试和跨浏览器回归均已接入；发布前仍由站点所有者做最终文案与交互确认。

## 目标

这一轮不按关键词批量复制页面。每个可索引 URL 都必须对应真实可用的工具状态、独立示例和清楚的限制说明。首页继续承接 `markdown to image`、`markdown to png`、`md to image`、`markdown screenshot` 等高度重合的核心词，避免同义词页面互相竞争。

## 本轮范围

### SEO 与路由基础

- 中文默认路由与 `/en/` 英文路由。
- 为每个工具页提供独立 title、description、canonical、hreflang、Open Graph 和 WebApplication 结构化数据。
- 构建时生成包含可读正文的静态 HTML，不能只依赖客户端修改 meta。
- 更新 sitemap，并保证直接访问深层 URL 时可以加载应用。

### 工具页与真实功能

| 路由 | 搜索意图 | 必须提供的实际差异 |
|---|---|---|
| `/` | Markdown 转图片 / PNG | 完整 Markdown 编辑、预览和多格式导出 |
| `/markdown-long-image/` | Markdown 长图 | 长图画布、分片高度和 ZIP 导出预设 |
| `/markdown-to-pdf/` | Markdown 转 PDF | A4/Letter、方向、边距、页码、页眉页脚、分页预览说明 |
| `/mermaid-to-image/` | Mermaid 转图片 | 直接粘贴 Mermaid 源码，不要求手动加 Markdown 围栏 |
| `/formula-to-image/` | LaTeX / 公式转图片 | 直接粘贴公式，自动包装为 KaTeX 块 |
| `/code-to-image/` | 代码转图片 | 直接粘贴代码、选择语言、保留语法高亮 |
| `/github-readme-to-image/` | GitHub README 转图片 | 从公开 GitHub 仓库、README 或 raw URL 拉取并修正相对资源地址；分支名含 `/` 时优先使用仓库地址或 GitHub 复制的 Raw 地址 |
| `/batch-markdown-to-image/` | 批量 Markdown 转图片 | 多文件导入、逐个渲染并打包为 ZIP |

英文页面使用相同 slug，前缀为 `/en/`。翻译页通过 hreflang 互相声明，不另外创建 `md-to-image`、`markdown-screenshot`、`markdown-to-jpg` 等同义词 URL。

### 画布与导出增强

- 补充 X、LinkedIn、微信公众号头图等社交最小尺寸预设；内容超出时画布增高，不裁掉正文。
- PDF 增加页码、页眉和页脚配置；继续保留可搜索的浏览器打印 PDF。
- 批量转换默认输出 PNG ZIP，单个文件失败时给出文件名和原因，不影响其他文件。

## 明确不做

- 不创建只有标题不同的 PNG、JPG、WebP、SVG 页面；这些格式由首页统一承接。
- 本轮不提供对外 HTTP API 或发布 npm CLI。当前项目是本地优先的纯前端工具，新增长期运行的渲染服务会引入内容上传、成本、限流和隐私边界；在没有部署与隐私方案前，不用空页面承接 `API/CLI` 关键词。
- 不抓取私有 GitHub 仓库，也不要求用户输入 Token。README URL 导入只处理公开资源。

## 文案标准

- 工具在说明之前可直接使用。
- 不写“在数字化时代”“无论你是……”一类填充句。
- 每页只解释该模式的操作、适合场景、已知限制和隐私边界。
- 示例必须可以在当前页面真实渲染；不伪造用户案例、搜索量或性能数据。
- 中文和英文都以短句为主，但保留必要的技术术语。

## 验收标准

- 所有列出的中文与英文 URL 都能直接打开、刷新和返回正确的页面标题。
- Mermaid、公式和代码页面的编辑器接收原始输入，预览中不显示自动包装语法。
- GitHub README 导入覆盖仓库 URL、blob URL、raw URL和无 README 的错误提示。
- 批量导出生成 ZIP，文件名经清理且不会相互覆盖。
- PDF 页码和页眉页脚不会压住正文。
- 静态 HTML、sitemap、canonical 和 hreflang 与路由清单一致。
- `npm run lint`、`npm test`、`npm run build`、关键 Playwright 用例通过。
- 完成后由独立 Agent 做只读审查；修复审查问题后重新跑验证。
- 只提交本轮文件，不 push。
