import type { Root, ThematicBreak } from 'mdast'
import type {} from 'mdast-util-to-hast'
import type { Plugin } from 'unified'

const PAGE_BREAK_COMMENT = /^\s*<!--\s*pagebreak\s*-->\s*$/i

export const remarkPageBreak: Plugin<[], Root> = () => (tree) => {
  tree.children = tree.children.map((node) => {
    if (node.type !== 'html' || !PAGE_BREAK_COMMENT.test(node.value)) {
      return node
    }

    return {
      type: 'thematicBreak',
      data: {
        hName: 'div',
        hProperties: {
          'aria-hidden': 'true',
          'data-page-break': '',
        },
      },
    } satisfies ThematicBreak
  })
}
