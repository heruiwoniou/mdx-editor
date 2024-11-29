/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react'
import { useSharedSuggestionContext } from '@/plugins/inline-suggestion/sharedSuggestionContext'
import { addClassNamesToElement } from '@lexical/utils'
import {
  $applyNodeReplacement,
  DOMConversionMap,
  DOMExportOutput,
  EditorConfig,
  ElementNode,
  LexicalEditor,
  NodeKey,
  DOMConversionOutput,
  SerializedElementNode,
  RangeSelection,
  LexicalNode,
  DecoratorNode,
  Spread,
  SerializedLexicalNode,
  EditorThemeClassName
} from 'lexical'
import * as Popover from '@radix-ui/react-popover'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

export type SerializedSuggestionNode = Spread<
  {
    uuid: string
    value: string
  },
  SerializedLexicalNode
>

export const uuid = Math.random()
  .toString(36)
  .replace(/[^a-z]+/g, '')
  .substr(0, 5)

/** @noInheritDoc */
export class SuggestionNode extends DecoratorNode<JSX.Element | null> {
  __uuid: string
  __value: string

  static clone(node: SuggestionNode): SuggestionNode {
    return new SuggestionNode(node.__uuid, node.__value, node.__key)
  }

  static getType(): 'suggestion' {
    return 'suggestion'
  }

  static importJSON(serializedNode: SerializedSuggestionNode): SuggestionNode {
    const node = $createSuggestionNode(serializedNode.value)
    return node
  }

  exportJSON(): SerializedSuggestionNode {
    return {
      ...super.exportJSON(),
      type: 'suggestion',
      uuid: this.__uuid,
      value: this.__value,
      version: 1
    }
  }

  constructor(uuid: string, value: string, key?: NodeKey) {
    super(key)
    this.__uuid = uuid
    this.__value = value
  }

  updateDOM(prevNode: unknown, dom: HTMLElement, config: EditorConfig): boolean {
    return false
  }

  createDOM(config: EditorConfig): HTMLElement {
    return document.createElement('span')
  }

  decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element | null {
    if (this.__uuid !== uuid) {
      return null
    }
    return <SuggestionComponent value={this.__value} />
  }
}

export function $createSuggestionNode(text: string, key?: string): SuggestionNode {
  return new SuggestionNode(uuid, text, key)
}

export function $isSuggestionNode(node: LexicalNode | null | undefined): node is SuggestionNode {
  return node instanceof SuggestionNode
}

function SuggestionComponent({ value }: { value: string }): JSX.Element {
  return (
    <span className="inline-suggestion-node" style={{ color: '#ccc' }} spellCheck="false">
      {value}
    </span>
  )
}
