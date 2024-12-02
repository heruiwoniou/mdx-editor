import React, { useEffect, useLayoutEffect, useRef } from 'react'
import { DiffSectionNode } from '@/plugins/diff-section/DiffSectionNode'
import { realmPlugin } from '../../RealmWithPlugins'
import {
  addImportVisitor$,
  addLexicalNode$,
  addExportVisitor$,
  addMdastExtension$,
  addSyntaxExtension$,
  addToMarkdownExtension$,
  addComposerChild$,
  activeEditor$
} from '../core'
import { LexicalDiffSectionVisitor } from '@/plugins/diff-section/LexicalDiffSectionVisitor'
import { MdastDiffSectionVisitor } from '@/plugins/diff-section/MdastDiffSectionVisitor'
import { directiveFromMarkdown, directiveToMarkdown } from 'mdast-util-directive'
import { directive } from 'micromark-extension-directive'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { Action, Cell, map, Signal, useCellValue, usePublisher, withLatestFrom } from '@mdxeditor/gurx'
import * as Popover from '@radix-ui/react-popover'
import { mergeRegister } from '@lexical/utils'
import { $createTextNode, $getNodeByKey, CLICK_COMMAND, COMMAND_PRIORITY_CRITICAL, COMMAND_PRIORITY_LOW, KEY_DOWN_COMMAND } from 'lexical'
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection'

type IDiffSectionState =
  | { active: false }
  | {
      active: true
      id: string
      rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>
    }

const defaultDiffSectionState = {
  active: false as const
}

const diffSectionState$ = Cell<IDiffSectionState>(defaultDiffSectionState, (r) => {
  // bind active signal
  r.link(
    r.pipe(
      activeDiffSection$,
      withLatestFrom(diffSectionState$, activeEditor$),
      map(([id]) => {
        const el = document.getElementById(id)
        if (el) {
          const domRect = el.getBoundingClientRect()
          return {
            id,
            active: true,
            rect: {
              left: domRect.left,
              top: domRect.top,
              width: domRect.width,
              height: domRect.height
            }
          }
        } else {
          return {
            active: false
          }
        }
      })
    ),
    diffSectionState$
  )
  // bind disable action
  r.link(
    r.pipe(
      disableDiffSection$,
      map(() => {
        return {
          active: false
        }
      })
    ),
    diffSectionState$
  )
  // bind accpet action
  r.link(
    r.pipe(
      acceptDiffSection$,
      withLatestFrom(diffSectionState$),
      map(([_, state]) => {
        if (state.active) {
          const uuid = state.id
          const el = document.getElementById(uuid)
          if (el) {
            const nodeKey = el.dataset.nodeKey
            if (nodeKey) {
              const sectionNode = $getNodeByKey(nodeKey)
              if (sectionNode) {
                const textNode = $createTextNode((sectionNode as DiffSectionNode).getDiff())
                sectionNode.replace(textNode)
                textNode.select()
                return {
                  active: false
                }
              }
            }
          }
        }

        return state
        // TODO:
      })
    ),
    diffSectionState$
  )
  // bind reject action
  r.link(
    r.pipe(
      rejectDiffSection$,
      withLatestFrom(diffSectionState$),
      map(([_, state]) => {
        if (state.active) {
          const uuid = state.id
          const el = document.getElementById(uuid)
          if (el) {
            const nodeKey = el.dataset.nodeKey
            if (nodeKey) {
              const sectionNode = $getNodeByKey(nodeKey)
              if (sectionNode) {
                const textNode = $createTextNode((sectionNode as DiffSectionNode).getSource())
                sectionNode.replace(textNode)
                textNode.select()

                return {
                  active: false
                }
              }
            }
          }
        }
        return state
      })
    ),
    diffSectionState$
  )
})

const activeDiffSection$ = Signal<string>()
const disableDiffSection$ = Action()
const acceptDiffSection$ = Action()
const rejectDiffSection$ = Action()

export function DiffSectionDecorate({
  uuid,
  source,
  diff,
  nodeKey
}: {
  uuid: string
  source: string
  diff: string
  nodeKey: string
}): JSX.Element {
  const [editor] = useLexicalComposerContext()
  const elementRef = useRef<HTMLSpanElement>(null)
  const activeDiffSection = usePublisher(activeDiffSection$)
  const disableDiffSection = usePublisher(disableDiffSection$)
  const [isSelect, setAsRange] = useLexicalNodeSelection(nodeKey)

  useLayoutEffect(() => {
    if (isSelect) {
      activeDiffSection(uuid)
    } else {
      disableDiffSection()
    }
  }, [activeDiffSection, disableDiffSection, isSelect, uuid])

  useEffect(() => {
    function ClickHandler(e: MouseEvent) {
      const target = e.target as HTMLSpanElement
      if (target.classList.contains('inline-diffsection')) {
        const wrapper = target.closest('.diffsection__container') ?? target
        if (wrapper === elementRef.current) {
          activeDiffSection(wrapper.id)
          setAsRange(true)
          return true
        }
      } else {
        disableDiffSection()
        return false
      }
      return false
    }

    return mergeRegister(editor.registerCommand(CLICK_COMMAND, ClickHandler, COMMAND_PRIORITY_LOW))
  }, [activeDiffSection, disableDiffSection, editor, setAsRange])

  return (
    <span
      id={uuid}
      data-node-key={nodeKey}
      className="inline-diffsection diffsection__container"
      style={{ display: 'inline-block' }}
      spellCheck="false"
      ref={elementRef}
    >
      <span
        className="inline-diffsection diffsection__source"
        style={{ background: 'rgba(255, 0, 0, 0.2)', borderBottom: '2px solid red' }}
        spellCheck="false"
      >
        {source}
      </span>
      <span
        className="inline-diffsection diffsection__diff"
        style={{ background: 'rgba(0, 255, 0, 0.2)', borderBottom: '2px solid green' }}
        spellCheck="false"
      >
        {diff}
      </span>
    </span>
  )
}

function FloatingTooltip() {
  const diffSectionState = useCellValue(diffSectionState$)

  return (
    <Popover.Root open={diffSectionState.active}>
      <Popover.Anchor asChild>
        <div
          style={{ position: 'absolute', pointerEvents: 'none', left: -9999, ...(diffSectionState.active ? diffSectionState.rect : {}) }}
        ></div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          collisionPadding={{ bottom: 65 }}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
          }}
        >
          <div style={{ padding: '2px 0px' }}>
            <div
              tabIndex={-1}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                color: 'white'
              }}
            >
              <div style={{ padding: 2, backgroundColor: 'green', cursor: 'pointer' }}>Accept (Y)</div>
              <div style={{ padding: 2, backgroundColor: 'red', cursor: 'pointer' }}>Reject (N)</div>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function Initialize() {
  const [editor] = useLexicalComposerContext()
  const diffSectionState = useCellValue(diffSectionState$)
  const activeDiffSection = usePublisher(activeDiffSection$)
  const disableDiffSection = usePublisher(disableDiffSection$)
  const accept = usePublisher(acceptDiffSection$)
  const reject = usePublisher(rejectDiffSection$)

  useEffect(() => {
    const destroies: (() => void)[] = []
    function handleMouseOver(e: MouseEvent) {
      const el = e.target as HTMLSpanElement
      if (el.classList.contains('inline-diffsection')) {
        const wrapper = el.closest('.diffsection__container') ?? el
        activeDiffSection(wrapper.id)
      } else {
        disableDiffSection()
      }
    }

    function $handleKeyPress(e: KeyboardEvent): boolean {
      const key = e.key.toLowerCase()
      if (diffSectionState.active) {
        if (key === 'y') {
          accept()
          e.preventDefault()
        }
        if (key === 'n') {
          reject()
          e.preventDefault()
        }
      }
      return false
    }

    const container = editor.getRootElement()
    if (container) {
      container.addEventListener('mouseover', handleMouseOver)

      destroies.push(() => {
        container.removeEventListener('mouseover', handleMouseOver)
      })
    }

    return mergeRegister(editor.registerCommand(KEY_DOWN_COMMAND, $handleKeyPress, COMMAND_PRIORITY_CRITICAL), () => {
      destroies.map((destroy) => {
        destroy()
      })
    })
  }, [accept, activeDiffSection, diffSectionState.active, disableDiffSection, editor, reject])

  return <FloatingTooltip />
}

export const diffSectionPlugin = realmPlugin({
  init(realm) {
    realm.pubIn({
      [addMdastExtension$]: directiveFromMarkdown(),
      [addToMarkdownExtension$]: directiveToMarkdown(),
      [addSyntaxExtension$]: directive(),

      [addImportVisitor$]: MdastDiffSectionVisitor,
      [addLexicalNode$]: DiffSectionNode,
      [addExportVisitor$]: LexicalDiffSectionVisitor,
      [addComposerChild$]: () => <Initialize />
    })
  }
})
