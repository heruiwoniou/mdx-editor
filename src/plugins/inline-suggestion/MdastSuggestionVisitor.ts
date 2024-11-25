import { $createSuggestionNode } from './SuggestionNode'
import * as Mdast from 'mdast'
import { MdastImportVisitor } from '../../importMarkdownToLexical'

export interface MdastSuggestion extends Mdast.Text {
  isSuggestion: true
  key: string
}

export const MdastSuggestionVisitor: MdastImportVisitor<MdastSuggestion> = {
  testNode: (node) => (node as MdastSuggestion).isSuggestion,
  visitNode({ mdastNode, actions }) {
    actions.addAndStepInto($createSuggestionNode(mdastNode.value, mdastNode.key))
  }
}
