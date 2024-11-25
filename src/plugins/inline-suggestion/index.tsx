/* eslint-disable no-console */
import { $createSuggestionNode, $isSuggestionNode, SuggestionNode, uuid } from './SuggestionNode'
import { realmPlugin } from '../../RealmWithPlugins'
import { addLexicalNode$, activeEditor$, addExportVisitor$, addImportVisitor$, addActivePlugin$, addComposerChild$ } from '../core'
import { Action, Cell, Signal, useCellValue, usePublisher, withLatestFrom } from '@mdxeditor/gurx'
import {
  $getNodeByKey,
  $insertNodes,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  $createTextNode,
  BaseSelection,
  createCommand,
  NodeKey,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_NORMAL,
  $getSelection,
  CommandListener,
  KEY_ARROW_RIGHT_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  KEY_TAB_COMMAND
} from 'lexical'
import { MdastSuggestionVisitor } from '@/plugins/inline-suggestion/MdastSuggestionVisitor'
import { LexicalSuggestionVisitor } from '@/plugins/inline-suggestion/LexicalSuggestionVisitor'
import { useEffect, useRef, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import React from 'react'
import { mergeRegister } from '@lexical/utils'
import { $isAtNodeEnd } from '@lexical/selection'
import * as Popover from '@radix-ui/react-popover'
import { $findMatchingParent } from '@lexical/utils'

interface StartSuggestionParameters {
  context: string
}

interface SuggestionState {
  loading: boolean
  context: string
  text: string
  startAt: number
  endAt: number
}

interface SuggestionResult {
  text: string
}

type SuggestionService = (context: string) => Promise<string>

let existingSuggestionKey: NodeKey | null = null

export const defaultState = { loading: false, index: 0, text: '', startAt: -1, endAt: 0, context: '' }

export const KEY_UP_COMMAND = createCommand('KEY_UP_COMMAND')

function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout !== null) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  }
}

function getPartialMatchRange(text: string, partial: string) {
  const partialLower = partial.toLocaleLowerCase()
  const textLower = text.toLocaleLowerCase()
  const len = partial.length
  let i = partial.length
  while (i-- && i >= 0) {
    if (!textLower.includes(partialLower.slice(-(len - i)))) {
      break
    }
  }
  const matchedPartial = partialLower.slice(i + 1)
  const trimMatchedPartial = matchedPartial.trim()
  if (trimMatchedPartial !== '') {
    const startAt = textLower.indexOf(matchedPartial)
    if (startAt === -1) {
      return { startAt: -1, endAt: 0 }
    }
    return {
      startAt,
      endAt: startAt + matchedPartial.length
    }
  }
  return { startAt: -1, endAt: 0 }
}

export const suggestionService$ = Cell<SuggestionService | null>(null)

export const suggestionState$ = Cell<SuggestionState>(defaultState)

export const startSuggestion$ = Signal<StartSuggestionParameters>((r) => {
  r.sub(
    startSuggestion$,
    debounce((_values: StartSuggestionParameters) => {
      console.log('start$')
      const suggestionService = r.getValue(suggestionService$)
      if (!suggestionService) {
        throw new Error('No suggestion service')
      }
      const state = r.getValue(suggestionState$)
      r.pub(suggestionState$, { ...state, loading: true, context: _values.context })
      suggestionService(_values.context)
        .then((response: string) => {
          r.pub(createSuggestion$, { text: response })
        })
        .catch((e: unknown) => {
          console.log((e as Error).message)
        })
    }, 1000)
  )
})

export const clearSuggestion$ = Action((r) => {
  r.sub(r.pipe(clearSuggestion$, withLatestFrom(activeEditor$)), ([_, theEditor]) => {
    theEditor?.update(() => {
      console.log('clear$')
      r.pub(suggestionState$, defaultState)
      if (existingSuggestionKey !== null) {
        const suggestionNode = $getNodeByKey(existingSuggestionKey)
        if (suggestionNode) {
          suggestionNode.remove()
          existingSuggestionKey = null
        }
      }
    })
  })
})

export const updateSuggestion$ = Signal<{ startAt: number; endAt: number; context: string }>((r) => {
  r.sub(r.pipe(updateSuggestion$, withLatestFrom(suggestionState$, activeEditor$)), ([values, state, theEditor]) => {
    theEditor?.update(() => {
      console.log('update$')
      const { startAt, endAt, context } = values
      r.pub(suggestionState$, { ...state, startAt, endAt, context })
      const node = $createSuggestionNode(startAt > -1 ? state.text.slice(endAt) : state.text)

      if (existingSuggestionKey !== null) {
        const suggestionNode = $getNodeByKey(existingSuggestionKey)
        if (suggestionNode) {
          existingSuggestionKey = node.getKey()
          suggestionNode.replace(node)
          return
        }
      }
      const selection = $getSelection()
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        return
      }
      const selectionCopy = selection.clone()
      existingSuggestionKey = node.getKey()
      $insertNodes([node])
      selectionCopy.insertNodes([node])
      $setSelection(selectionCopy)
    })
  })
})

export const acceptSuggestion$ = Action((r) => {
  r.sub(r.pipe(acceptSuggestion$, withLatestFrom(suggestionState$, activeEditor$)), ([, state, theEditor]) => {
    theEditor?.update(() => {
      console.log('accept$', state)
      if (existingSuggestionKey !== null) {
        const suggestionNode = $getNodeByKey(existingSuggestionKey)
        if (suggestionNode) {
          const textNode = $createTextNode(state.text.slice(state.endAt))
          suggestionNode.replace(textNode)
          textNode.selectNext()

          r.pub(clearSuggestion$)
        }
      }
    })
  })
})

export const createSuggestion$ = Signal<SuggestionResult>((r) => {
  r.sub(r.pipe(createSuggestion$, withLatestFrom(activeEditor$, suggestionState$)), ([values, theEditor, state]) => {
    console.log('async create$', values.text)
    const { startAt, endAt } = getPartialMatchRange(values.text, state.context)
    r.pub(suggestionState$, { ...state, loading: false, text: values.text, startAt, endAt })
    theEditor?.update(
      () => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return
        }
        if (existingSuggestionKey !== null) {
          const suggestionNode = $getNodeByKey(existingSuggestionKey)
          if (suggestionNode) {
            suggestionNode.remove()
          }
        }
        const selectionCopy = selection.clone()
        const node = $createSuggestionNode(startAt > -1 ? values.text.slice(endAt) : values.text)
        existingSuggestionKey = node.getKey()
        $insertNodes([node])
        selectionCopy.insertNodes([node])
        $setSelection(selectionCopy)
      },
      { tag: 'history-merge' }
    )
  })
})

const useStaticMemo = (target: Record<string, any>) => {
  const ref = useRef<typeof target>(target)
  Object.entries(target).forEach(([key, value]) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    ref.current[key] = value
  })
  return ref
}

const FloatingTooltip = () => {
  const [editor] = useLexicalComposerContext()
  const ref = useRef<HTMLDivElement>(null)
  const state = useCellValue(suggestionState$)
  const open = !state.loading && state.text.length > 0 && state.text.length > state.endAt
  const [position, setPosition] = useState<Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>>({ left: 0, top: 0, width: 0, height: 0 })

  useEffect(() => {
    if (open) {
      editor.update(() => {
        if (existingSuggestionKey) {
          const suggestionNode = $getNodeByKey(existingSuggestionKey)
          if (suggestionNode) {
            const nativeSelection = window.getSelection()
            const nativeAnchor = nativeSelection?.anchorNode
            if (nativeAnchor && editor.getRootElement()?.contains(nativeAnchor)) {
              const domRect: DOMRect | undefined = nativeAnchor.parentElement?.getBoundingClientRect()
              if (domRect) {
                setPosition({
                  left: domRect.left,
                  top: domRect.top,
                  width: domRect.width,
                  height: domRect.height
                })
              }
            }
          }
        }
      })
    }
  }, [editor, open, state])

  // arrow character
  // right: \u2192

  return (
    <Popover.Root open={open}>
      <Popover.Anchor asChild>
        <div ref={ref} style={{ position: 'absolute', pointerEvents: 'none', ...position }}></div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content side="right" align="start">
          <div
            tabIndex={-1}
            style={{
              padding: '4px',
              border: '1px solid #ccc',
              backgroundColor: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transform: 'translateY(-100%)'
            }}
          >
            <button tabIndex={-1}>
              Accept <code style={{ border: '1px solid #ccc', padding: '1px', fontSize: 10 }}>TAB</code>
            </button>
            <button tabIndex={-1}>
              Accept Word <code style={{ border: '1px solid #ccc', padding: '1px', fontSize: 10 }}>&#8594;</code>
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

const Initialize = () => {
  const [editor] = useLexicalComposerContext()
  const previousSelectionRef = useRef<BaseSelection | null>(null)
  const suggestionState = useCellValue(suggestionState$)
  const startSuggestion = usePublisher(startSuggestion$)
  const updateSuggestion = usePublisher(updateSuggestion$)
  const clearSuggestion = usePublisher(clearSuggestion$)
  const acceptSuggestion = usePublisher(acceptSuggestion$)

  const memoRef = useRef<{ suggestionState: SuggestionState }>({ suggestionState })
  memoRef.current.suggestionState = suggestionState

  useEffect(() => {
    function handleAutocompleteNodeTransform(node: SuggestionNode) {
      if (node.__uuid === uuid && existingSuggestionKey !== node.getKey()) {
        clearSuggestion()
      }
    }

    const handleTextChange = () => {
      console.log('$textChange')
      editor.update(
        () => {
          const selection = $getSelection()

          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            clearSuggestion()
            return
          }
          const node = selection.getNodes()[0]
          const anchor = selection.anchor
          if (!$isTextNode(node) || !node.isSimpleText() || !$isAtNodeEnd(anchor)) {
            clearSuggestion()
            return
          }

          const state = memoRef.current.suggestionState

          const context = node.getTextContent()

          if (context) {
            if (!state.loading && state.text.length > 0) {
              const range = getPartialMatchRange(state.text, context)
              console.log(range, state.text, context)
              if (range.startAt > -1) {
                updateSuggestion({ ...range, context: context })
                return
              }
            }
            clearSuggestion()
            startSuggestion({ context: context })
          }
        },
        { tag: 'history-merge' }
      )
    }

    const handleRangeChange: CommandListener<void> = () => {
      console.log('$keypress')
      editor.update(
        () => {
          const currentSelection = $getSelection()
          const previousSelection = previousSelectionRef.current
          if (currentSelection !== previousSelection) {
            if (!$isRangeSelection(currentSelection) || !currentSelection.isCollapsed()) {
              clearSuggestion()
              return
            }
            const nodes = currentSelection.getNodes()
            if (nodes.length > 0) {
              const node = nodes[0]
              const anchor = currentSelection.anchor
              if (!$isTextNode(node) || !node.isSimpleText() || !$isAtNodeEnd(anchor)) {
                clearSuggestion()
                return
              }
            }
            previousSelectionRef.current = currentSelection
          }
        },
        { tag: 'history-merge' }
      )
      return true
    }

    const $handleKeyPressCommand: CommandListener<KeyboardEvent> = (e) => {
      console.log('$keypress')
      if (existingSuggestionKey !== null) {
        const suggestionNode = $getNodeByKey(existingSuggestionKey)
        if (suggestionNode) {
          acceptSuggestion()
          e.preventDefault()
          return true
        }
      }
      return false
    }

    return mergeRegister(
      editor.registerTextContentListener(handleTextChange),
      editor.registerCommand(KEY_TAB_COMMAND, $handleKeyPressCommand, COMMAND_PRIORITY_CRITICAL),
      editor.registerCommand(KEY_ARROW_RIGHT_COMMAND, $handleKeyPressCommand, COMMAND_PRIORITY_CRITICAL),
      editor.registerCommand(SELECTION_CHANGE_COMMAND, handleRangeChange, COMMAND_PRIORITY_NORMAL),
      editor.registerNodeTransform(SuggestionNode, handleAutocompleteNodeTransform),
      () => {
        clearSuggestion()
      }
    )
  }, [acceptSuggestion, clearSuggestion, editor, startSuggestion, updateSuggestion])

  return <FloatingTooltip />
}

export const inlineSuggestionPlugin = realmPlugin<{ service: SuggestionService }>({
  init(realm, params) {
    realm.pubIn({
      [addActivePlugin$]: 'inline-suggestion',
      [addImportVisitor$]: MdastSuggestionVisitor,
      [addLexicalNode$]: SuggestionNode,
      [addExportVisitor$]: LexicalSuggestionVisitor,
      [addComposerChild$]: () => <Initialize />
    })

    realm.pub(suggestionService$, params?.service ?? null)
  },
  update(realm, params) {
    realm.pub(suggestionService$, params?.service ?? null)
  }
})
