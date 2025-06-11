/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react'
import {
  EditorConfig,
  LexicalEditor,
  NodeKey,
  LexicalNode,
  ElementNode,
  Spread,
  SerializedLexicalNode,
  DecoratorNode,
  DOMExportOutput,
  DOMConversionMap,
  DOMConversionOutput
} from 'lexical'
import { DiffSectionDecorate } from '@/plugins/diff-section'

function convertDiffSectionElement(domNode: Node): null | DOMConversionOutput {
  if (domNode instanceof HTMLSpanElement) {
    const source = domNode.innerHTML
    const diff = domNode.dataset.diff ?? ''
    const node = $createDiffSectionNode(source, diff)
    return { node }
  }
  return null
}

export type SerializedDiffSectionNode = Spread<
  {
    source: string
    diff: string
    uuid: string
  },
  SerializedLexicalNode
>

export const guuid = () =>
  Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, '')
    .slice(0, 10)

/** @noInheritDoc */
export class DiffSectionNode extends DecoratorNode<JSX.Element> {
  __source: string
  __diff: string
  __uuid: string

  static getType(): 'diffsection' {
    return 'diffsection'
  }

  static clone(node: DiffSectionNode): DiffSectionNode {
    return new DiffSectionNode(node.__source, node.__diff, node.__uuid, node.__key)
  }

  static importJSON(serializedNode: SerializedDiffSectionNode): DiffSectionNode {
    const node = $createDiffSectionNode(serializedNode.source, serializedNode.diff)
    return node
  }

  /** @internal */
  static importDOM(): DOMConversionMap | null {
    return {
      span: () => ({
        conversion: convertDiffSectionElement,
        priority: 0
      })
    }
  }

  getTextContent(): string {
    return this.__source
  }

  /** @internal */
  exportDOM(): DOMExportOutput {
    const element = document.createElement('span')
    element.innerHTML = this.__source
    element.dataset.diff = this.__diff
    return { element }
  }

  constructor(source: string, diff: string, uuid?: string, key?: NodeKey) {
    super(key)
    this.__source = source
    this.__diff = diff
    this.__uuid = uuid ?? guuid()
  }

  /** @internal */
  exportJSON(): SerializedDiffSectionNode {
    return {
      source: this.__source,
      diff: this.__diff,
      uuid: this.__uuid,
      type: 'diffsection',
      version: 1
    }
  }

  updateDOM(prevNode: unknown, dom: HTMLElement, config: EditorConfig): boolean {
    return false
  }

  createDOM(config: EditorConfig): HTMLElement {
    return document.createElement('span')
  }

  getSource() {
    return this.__source
  }

  getDiff() {
    return this.__diff
  }

  decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
    return <DiffSectionDecorate uuid={this.__uuid} source={this.__source} diff={this.__diff} nodeKey={this.getKey()} />
  }
}

export function $createDiffSectionNode(source: string, diff: string, uuid?: string, key?: string): DiffSectionNode {
  return new DiffSectionNode(source, diff, uuid, key)
}

export function $isDiffSectionNode(node: LexicalNode | null | undefined): node is DiffSectionNode {
  return node instanceof DiffSectionNode
}
