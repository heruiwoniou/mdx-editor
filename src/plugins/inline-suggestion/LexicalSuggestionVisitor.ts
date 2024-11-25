import { $isSuggestionNode, SuggestionNode } from './SuggestionNode'
import { LexicalExportVisitor } from '../../exportMarkdownFromLexical'
import { MdastSuggestion } from '@/plugins/inline-suggestion/MdastSuggestionVisitor'

export const LexicalSuggestionVisitor: LexicalExportVisitor<SuggestionNode, MdastSuggestion> = {
  testLexicalNode: $isSuggestionNode,
  visitLexicalNode: ({ lexicalNode, mdastParent, actions }) => {
    const text: MdastSuggestion = { type: 'text', value: lexicalNode.getTextContent(), isSuggestion: true, key: lexicalNode.getKey() }
    actions.appendToParent(mdastParent, text)
  }
}
