import { chromium } from '@playwright/test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const output = join(projectRoot, 'public', 'og.jpg')
const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
})

await page.setContent(`
  <!doctype html>
  <html lang="en">
    <style>
      * { box-sizing: border-box; }
      body {
        width: 1200px;
        height: 630px;
        margin: 0;
        overflow: hidden;
        color: #292722;
        background:
          radial-gradient(circle at 14% 16%, rgba(242, 95, 58, .15), transparent 25%),
          radial-gradient(circle at 85% 82%, rgba(72, 118, 89, .14), transparent 30%),
          #f4f1e9;
        font-family: Inter, "Segoe UI", "Microsoft YaHei", sans-serif;
      }
      main {
        display: grid;
        grid-template-columns: .92fr 1.08fr;
        gap: 54px;
        width: 100%;
        height: 100%;
        padding: 58px 66px;
      }
      .copy { display: flex; flex-direction: column; justify-content: center; }
      .brand { display: flex; align-items: center; gap: 15px; margin-bottom: 46px; }
      .mark {
        position: relative;
        display: grid;
        width: 58px;
        height: 58px;
        place-items: center;
        color: #fbfaf6;
        border-radius: 16px;
        background: #292722;
        font-size: 27px;
        font-weight: 800;
      }
      .mark::after {
        content: "✦";
        position: absolute;
        top: -12px;
        right: -11px;
        color: #f25f3a;
        font-size: 27px;
      }
      .brand strong { font-size: 28px; letter-spacing: -.04em; }
      .brand small {
        display: block;
        margin-top: 3px;
        color: #747065;
        font-size: 13px;
        letter-spacing: .14em;
        text-transform: uppercase;
      }
      h1 {
        max-width: 500px;
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 55px;
        line-height: 1.04;
        letter-spacing: -.045em;
      }
      .lead {
        max-width: 460px;
        margin: 26px 0 0;
        color: #67635b;
        font-size: 20px;
        line-height: 1.55;
      }
      .modes {
        display: flex;
        gap: 9px;
        margin-top: 34px;
        color: #545149;
        font: 700 12px/1 ui-monospace, SFMono-Regular, Consolas, monospace;
        letter-spacing: .045em;
      }
      .modes span {
        padding: 10px 12px;
        border: 1px solid #d8d2c5;
        border-radius: 999px;
        background: rgba(255, 255, 255, .5);
      }
      .visual { position: relative; display: grid; place-items: center; }
      .visual::before {
        content: "";
        position: absolute;
        width: 480px;
        height: 420px;
        border: 1px solid rgba(91, 82, 67, .12);
        border-radius: 32px;
        transform: rotate(5deg);
      }
      .card {
        position: relative;
        width: 500px;
        min-height: 430px;
        padding: 42px 42px 28px;
        border: 1px solid rgba(91, 82, 67, .14);
        border-radius: 24px;
        background: #fffefa;
        box-shadow: 0 28px 70px rgba(64, 52, 34, .16);
        transform: rotate(-2.5deg);
      }
      .eyebrow {
        color: #ba4c31;
        font: 700 12px/1 ui-monospace, SFMono-Regular, Consolas, monospace;
        letter-spacing: .12em;
      }
      .card h2 {
        margin: 18px 0 13px;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 36px;
        letter-spacing: -.035em;
      }
      .card p { margin: 0; color: #6b675f; font-size: 17px; line-height: 1.65; }
      pre {
        margin: 24px 0 32px;
        padding: 18px 20px;
        color: #d9f2df;
        border-radius: 13px;
        background: #17201a;
        font: 14px/1.55 ui-monospace, SFMono-Regular, Consolas, monospace;
      }
      code b { color: #ff8a6e; font-weight: 500; }
      footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 17px;
        color: #716d64;
        border-top: 1px solid #e1ddd3;
        font-size: 12px;
      }
      footer strong { color: #292722; font-size: 14px; letter-spacing: .03em; }
      footer small { display: block; margin-top: 3px; letter-spacing: .08em; }
      footer .meta { text-align: right; font-family: ui-monospace, Consolas, monospace; }
    </style>
    <body>
      <main>
        <section class="copy">
          <div class="brand">
            <span class="mark">M</span>
            <span><strong>MarkGleam</strong><small>Structured content studio</small></span>
          </div>
          <h1>Turn structured content into share-ready visuals.</h1>
          <p class="lead">Shape Markdown, code, diagrams and formulas with one focused visual workspace.</p>
          <div class="modes">
            <span>MARKDOWN</span><span>CODE</span><span>MERMAID</span><span>LATEX</span>
          </div>
        </section>
        <section class="visual">
          <article class="card">
            <span class="eyebrow">MARKDOWN → VISUAL</span>
            <h2>Ideas, ready to share</h2>
            <p>Clear type, thoughtful spacing, and a canvas sized for where the work will live.</p>
            <pre><code><b>const</b> visual = markgleam.render({
  source: "structured content",
  format: "png"
})</code></pre>
            <footer>
              <span><strong>MarkGleam</strong><small>CONTENT, MADE VISIBLE.</small></span>
              <span class="meta">MARKDOWN · PAPER<br>1200 PX · markgleam.com</span>
            </footer>
          </article>
        </section>
      </main>
    </body>
  </html>
`)

await page.screenshot({
  path: output,
  type: 'jpeg',
  quality: 86,
})
await browser.close()

console.log(`Generated ${output}`)
