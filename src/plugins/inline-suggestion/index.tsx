/* eslint-disable no-console */
import { $createSuggestionNode, SuggestionNode, uuid } from './SuggestionNode'
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

export type SuggestionService = (context: string) => Promise<string>

let existingSuggestionKey: NodeKey | null = null

export const defaultState = {
  loading: false,
  index: 0,
  text: '',
  startAt: -1,
  endAt: 0,
  context: ''
}

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

function rangeMatcher(text: string, partial: string) {
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
  if (trimMatchedPartial !== '' && textLower.startsWith(matchedPartial)) {
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

export const regenerateSuggestion$ = Action((r) => {
  r.sub(r.pipe(regenerateSuggestion$, withLatestFrom(suggestionState$)), ([, state]) => {
    const context = state.context
    r.pub(clearSuggestion$)
    r.pub(startSuggestion$, { context })
  })
})

export const startSuggestion$ = Signal<StartSuggestionParameters>((r) => {
  r.sub(
    startSuggestion$,
    debounce((values: StartSuggestionParameters) => {
      const suggestionService = r.getValue(suggestionService$)
      if (!suggestionService) {
        throw new Error('No suggestion service')
      }
      const state = r.getValue(suggestionState$)
      r.pub(suggestionState$, { ...state, context: values.context })
      suggestionService(values.context)
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
    const { startAt, endAt } = rangeMatcher(values.text, state.context)
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

const FloatingTooltip = () => {
  const [editor] = useLexicalComposerContext()
  const acceptSuggestion = usePublisher(acceptSuggestion$)
  const regenerateSuggestion = usePublisher(regenerateSuggestion$)
  const ref = useRef<HTMLDivElement>(null)
  const state = useCellValue(suggestionState$)
  const open = !state.loading && state.text.length > 0 && state.text.length > state.endAt
  const [position, setPosition] = useState<Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>>({
    left: 0,
    top: 0,
    width: 0,
    height: 0
  })

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        editor.update(() => {
          if (existingSuggestionKey) {
            const suggestionNode = $getNodeByKey(existingSuggestionKey)
            if (suggestionNode) {
              const nativeSuggestionNode = document.querySelector('.inline-suggestion-node')
              if (nativeSuggestionNode) {
                const editorRect: DOMRect | undefined = editor.getRootElement()?.getBoundingClientRect()
                const domRect: DOMRect | undefined = nativeSuggestionNode.closest('p')?.getBoundingClientRect()
                if (domRect && editorRect) {
                  setPosition({
                    top: domRect.top,
                    height: domRect.height + 10,
                    left: editorRect.left,
                    width: editorRect.width
                  })
                }
              }
            }
          }
        })
      })
    }
  }, [editor, open, state])

  return (
    <Popover.Root open={open}>
      <Popover.Anchor asChild>
        <div ref={ref} style={{ position: 'absolute', pointerEvents: 'none', ...position }}></div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="center"
          collisionPadding={{ bottom: 65 }}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
          }}
        >
          <div
            tabIndex={-1}
            style={{
              padding: '4px',
              border: '1px solid #ccc',
              backgroundColor: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
              gap: '8px'
            }}
          >
            <button
              tabIndex={-1}
              onClick={() => {
                acceptSuggestion()
              }}
            >
              Accept
            </button>
            <button
              tabIndex={-1}
              onClick={() => {
                regenerateSuggestion()
              }}
            >
              Regenerate
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
              const range = rangeMatcher(state.text, context)
              if (range.startAt > -1) {
                updateSuggestion({ ...range, context })
                return
              }
            }
            clearSuggestion()
            startSuggestion({ context })
          }
        },
        { tag: 'history-merge' }
      )
    }

    const handleRangeChange: CommandListener<void> = () => {
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

const inlineSuggestionPlugin = realmPlugin<{ service: SuggestionService }>({
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

export default inlineSuggestionPlugin
