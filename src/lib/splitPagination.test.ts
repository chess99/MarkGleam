import { describe, expect, it } from 'vitest'
import {
  calculateSplitContentBudget,
  getSplitPagePlan,
  type SplitPaginationConfig,
} from './splitPagination'

const rectangle = (
  top: number,
  height: number,
  width = 1080,
  left = 0,
): DOMRect =>
  ({
    x: left,
    y: top,
    top,
    right: left + width,
    bottom: top + height,
    left,
    width,
    height,
    toJSON: () => ({}),
  }) as DOMRect

const mockRectangle = (
  element: Element,
  value: DOMRect,
) => {
  element.getBoundingClientRect = () => value
}

const mockLayoutSize = (
  element: HTMLElement,
  width: number,
  height: number,
) => {
  Object.defineProperties(element, {
    offsetWidth: { configurable: true, value: width },
    clientWidth: { configurable: true, value: width },
    offsetHeight: { configurable: true, value: height },
    clientHeight: { configurable: true, value: height },
  })
}

const config = (
  overrides: Partial<SplitPaginationConfig> = {},
): SplitPaginationConfig => ({
  scale: 1,
  splitHeight: 1000,
  splitMode: 'compact',
  ...overrides,
})

describe('calculateSplitContentBudget', () => {
  it('reserves all non-content vertical space and stays positive', () => {
    expect(calculateSplitContentBudget(1440, 144, 52, 36)).toBe(1208)
    expect(calculateSplitContentBudget(640, 500, 200, 100)).toBe(1)
  })
})

describe('getSplitPagePlan', () => {
  it('measures logical CSS pixels beneath a transformed parent', () => {
    const wrapper = document.createElement('div')
    wrapper.style.transform = 'scale(0.5)'
    const surface = document.createElement('section')
    surface.style.padding = '40px 0 60px'
    surface.innerHTML = `
      <article data-export-content>
        <p>First</p>
        <p>Second</p>
      </article>
    `
    wrapper.append(surface)
    document.body.append(wrapper)

    mockLayoutSize(surface, 1080, 2000)
    mockRectangle(surface, rectangle(100, 1000, 540))
    const blocks = [...surface.querySelectorAll<HTMLElement>('p')]
    mockRectangle(blocks[0], rectangle(150, 150, 500))
    mockRectangle(blocks[1], rectangle(310, 100, 500))

    expect(getSplitPagePlan(surface, config())).toEqual({
      pageHeight: 1000,
      contentBudget: 900,
      groups: [{ start: 0, end: 2, height: 520, startTop: 100 }],
      oversizedBlocks: [],
      horizontalOverflow: false,
    })
  })

  it('deducts every surface and content box inset plus the signature', () => {
    const surface = document.createElement('section')
    surface.style.paddingTop = '72px'
    surface.style.paddingBottom = '72px'
    surface.style.borderTop = '3px solid'
    surface.style.borderBottom = '3px solid'
    surface.innerHTML = `
      <article
        data-export-content
        style="
          padding: 20px 0 48px;
          border-top: 2px solid;
          border-bottom: 2px solid;
          margin: 6px 0;
        "
      >
        <p>Body</p>
      </article>
      <footer data-export-signature>Signature</footer>
    `
    document.body.append(surface)

    mockLayoutSize(surface, 1080, 2000)
    mockRectangle(surface, rectangle(0, 2000))
    const body = surface.querySelector<HTMLElement>('p')!
    const signature = surface.querySelector<HTMLElement>(
      '[data-export-signature]',
    )!
    mockRectangle(body, rectangle(72, 300))
    mockRectangle(signature, rectangle(1884, 44))

    const plan = getSplitPagePlan(
      surface,
      config({ splitHeight: 1440 }),
    )

    expect(plan.pageHeight).toBe(1440)
    expect(plan.contentBudget).toBe(1162)
  })

  it('marks a short block oversized when content padding consumes the page', () => {
    const surface = document.createElement('section')
    surface.innerHTML = `
      <article data-export-content style="padding-top: 1200px">
        <p>Short body</p>
      </article>
    `
    document.body.append(surface)

    mockLayoutSize(surface, 1080, 1600)
    mockRectangle(surface, rectangle(0, 1600))
    const body = surface.querySelector<HTMLElement>('p')!
    mockRectangle(body, rectangle(1200, 80))

    const plan = getSplitPagePlan(
      surface,
      config({ splitHeight: 1000, splitMode: 'fixed' }),
    )

    expect(plan.contentBudget).toBe(1)
    expect(plan.oversizedBlocks).toEqual([{ index: 0, height: 80 }])
  })

  it('reports an oversized block and keeps it on its own page', () => {
    const surface = document.createElement('section')
    surface.style.padding = '50px 0'
    surface.innerHTML = `
      <article data-export-content>
        <p>Oversized</p>
        <p>Small</p>
      </article>
    `
    document.body.append(surface)

    mockLayoutSize(surface, 1080, 900)
    mockRectangle(surface, rectangle(0, 900))
    const blocks = [...surface.querySelectorAll<HTMLElement>('p')]
    mockRectangle(blocks[0], rectangle(50, 700))
    mockRectangle(blocks[1], rectangle(760, 100))

    expect(
      getSplitPagePlan(surface, config({ splitHeight: 600 })),
    ).toEqual({
      pageHeight: 640,
      contentBudget: 540,
      groups: [
        { start: 0, end: 1, height: 700, startTop: 50 },
        { start: 1, end: 2, height: 100, startTop: 760 },
      ],
      oversizedBlocks: [{ index: 0, height: 700 }],
      horizontalOverflow: false,
    })
  })

  it('reports content wider than the logical canvas', () => {
    const surface = document.createElement('section')
    surface.innerHTML = `
      <article data-export-content>
        <p>Wide content</p>
      </article>
    `
    document.body.append(surface)

    mockLayoutSize(surface, 1080, 900)
    Object.defineProperty(surface, 'scrollWidth', {
      configurable: true,
      value: 1440,
    })
    mockRectangle(surface, rectangle(0, 900))
    mockRectangle(
      surface.querySelector<HTMLElement>('p')!,
      rectangle(40, 100, 1440),
    )

    expect(getSplitPagePlan(surface, config()).horizontalOverflow).toBe(true)
  })

  it('detects nested content that is clipped by its own block', () => {
    const surface = document.createElement('section')
    surface.innerHTML = `
      <article data-export-content>
        <table><tbody><tr><td>Unbreakable content</td></tr></tbody></table>
      </article>
    `
    document.body.append(surface)

    mockLayoutSize(surface, 1080, 900)
    Object.defineProperty(surface, 'scrollWidth', {
      configurable: true,
      value: 1080,
    })
    mockRectangle(surface, rectangle(0, 900))
    const table = surface.querySelector<HTMLElement>('table')!
    const cell = surface.querySelector<HTMLElement>('td')!
    mockLayoutSize(table, 900, 100)
    mockLayoutSize(cell, 120, 80)
    Object.defineProperty(cell, 'scrollWidth', {
      configurable: true,
      value: 360,
    })
    mockRectangle(table, rectangle(40, 100, 900))

    expect(getSplitPagePlan(surface, config()).horizontalOverflow).toBe(true)
  })

  it('respects forced page breaks in both split modes', () => {
    const surface = document.createElement('section')
    surface.innerHTML = `
      <article data-export-content>
        <p>First</p>
        <div data-page-break></div>
        <p>Second</p>
      </article>
    `
    document.body.append(surface)

    mockLayoutSize(surface, 1080, 1000)
    mockRectangle(surface, rectangle(0, 1000))
    const children = [
      ...surface.querySelector<HTMLElement>('[data-export-content]')!
        .children,
    ] as HTMLElement[]
    mockRectangle(children[0], rectangle(40, 100))
    mockRectangle(children[1], rectangle(150, 1))
    mockRectangle(children[2], rectangle(180, 200))

    const compact = getSplitPagePlan(surface, config())
    const fixed = getSplitPagePlan(
      surface,
      config({ splitMode: 'fixed' }),
    )

    expect(compact.groups).toEqual([
      { start: 0, end: 1, height: 100, startTop: 40 },
      { start: 2, end: 3, height: 200, startTop: 180 },
    ])
    expect(fixed.groups).toEqual(compact.groups)
    expect(fixed.oversizedBlocks).toEqual(compact.oversizedBlocks)
  })
})
