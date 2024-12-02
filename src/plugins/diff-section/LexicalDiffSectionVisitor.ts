import { $isDiffSectionNode, DiffSectionNode } from './DiffSectionNode'
import { LexicalExportVisitor } from '../../exportMarkdownFromLexical'
import { Directives, TextDirective } from 'mdast-util-directive'

export const LexicalDiffSectionVisitor: LexicalExportVisitor<DiffSectionNode, Directives> = {
  testLexicalNode: $isDiffSectionNode,
  visitLexicalNode: ({ lexicalNode, mdastParent, actions }) => {
    const mdastNode: TextDirective = {
      type: 'textDirective',
      name: 'diffsection',
      attributes: {
        diff: lexicalNode.getDiff()
      },
      children: [{ type: 'text', value: lexicalNode.getSource() }]
    }
    actions.appendToParent(mdastParent, mdastNode)
  }
}
