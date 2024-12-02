import { $createDiffSectionNode } from './DiffSectionNode'
import { MdastImportVisitor } from '../../importMarkdownToLexical'
import { TextDirective } from 'mdast-util-directive'
import { ElementNode } from 'lexical'
import * as Mdast from 'mdast'

export const MdastDiffSectionVisitor: MdastImportVisitor<TextDirective> = {
  testNode: (mdastNode) => {
    return mdastNode.type === 'textDirective' && mdastNode.name === 'diffsection'
  },
  visitNode({ mdastNode, lexicalParent }) {
    ;(lexicalParent as ElementNode).append(
      $createDiffSectionNode((mdastNode.children[0] as Mdast.Text).value, mdastNode.attributes?.diff ?? '')
    )
  }
}
