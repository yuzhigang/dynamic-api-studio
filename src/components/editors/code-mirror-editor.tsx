import { autocompletion } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { sql } from '@codemirror/lang-sql'
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import { useEffect, useMemo, useRef } from 'react'

import { cn } from '@/lib/cn'

import { editorTheme } from '@/components/editors/extensions/editor-theme'
import { variableCompletion } from '@/components/editors/extensions/variable-completion'
import { variableLinter } from '@/components/editors/extensions/variable-linter'
import { variableTooltip } from '@/components/editors/extensions/variable-tooltip'
import type { SymbolItem } from '@/components/editors/build-symbol-store'

type EditorLanguage = 'sql' | 'javascript' | 'json'

type CodeMirrorEditorProps = {
  value: string
  language: EditorLanguage
  symbols?: SymbolItem[]
  readOnly?: boolean
  /** 为 true 时编辑器高度由内容撑开（适合放在自适应布局中）。 */
  autoHeight?: boolean
  onChange?: (value: string) => void
}

function languageExtension(language: EditorLanguage): Extension {
  switch (language) {
    case 'sql':
      return sql()
    case 'javascript':
      return javascript({ typescript: false })
    case 'json':
      return json()
  }
}

function sqlSymbolExtensions(symbols: SymbolItem[]): Extension {
  return [variableCompletion(symbols), variableLinter(symbols), variableTooltip(symbols)]
}

export function CodeMirrorEditor({
  value,
  language,
  symbols = [],
  readOnly = false,
  autoHeight = false,
  onChange,
}: CodeMirrorEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const symbolsRef = useRef(symbols)
  const initialDocRef = useRef(value)

  const compartments = useMemo(
    () => ({
      language: new Compartment(),
      editable: new Compartment(),
      onChange: new Compartment(),
      sqlSymbols: new Compartment(),
    }),
    [],
  )

  const autoHeightRef = useRef(autoHeight)

  useEffect(() => {
    autoHeightRef.current = autoHeight
  }, [autoHeight])

  const baseExtensions = useMemo<Extension[]>(
    () => [
      lineNumbers(),
      drawSelection(),
      history(),
      highlightActiveLine(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.theme({
        '&': {
          height: '100%',
        },
        '.cm-scroller': {
          overflow: 'auto',
        },
        '.cm-content': {
          minHeight: '100%',
        },
      }),
      autoHeight
        ? EditorView.theme({
            '&': {
              height: 'auto',
              maxHeight: '100%',
            },
            '.cm-scroller': {
              overflow: 'auto',
            },
            '.cm-content': {
              minHeight: 'unset',
            },
          })
        : [],
      autocompletion(),
      syntaxHighlighting(defaultHighlightStyle),
      editorTheme,
      compartments.language.of(languageExtension(language)),
      compartments.editable.of(EditorView.editable.of(!readOnly)),
      compartments.onChange.of(
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current?.(update.state.doc.toString())
          }
        }),
      ),
      language === 'sql' ? compartments.sqlSymbols.of(sqlSymbolExtensions(symbolsRef.current)) : [],
    ],
    // Compartments are stable; initial values are captured at construction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    symbolsRef.current = symbols
  }, [symbols])

  // Create the editor once. The initial doc is captured here so subsequent
  // prop value changes do not destroy and recreate the editor.
  useEffect(() => {
    if (!hostRef.current) {
      return
    }

    const state = EditorState.create({
      doc: initialDocRef.current,
      extensions: baseExtensions,
    })

    const view = new EditorView({
      state,
      parent: hostRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [baseExtensions])

  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }

    view.dispatch({
      effects: compartments.language.reconfigure(languageExtension(language)),
    })
  }, [compartments, language])

  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }

    view.dispatch({
      effects: compartments.editable.reconfigure(EditorView.editable.of(!readOnly)),
    })
  }, [compartments, readOnly])

  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }

    view.dispatch({
      effects: compartments.sqlSymbols.reconfigure(
        language === 'sql' ? sqlSymbolExtensions(symbolsRef.current) : [],
      ),
    })
  }, [compartments, language, symbols])

  // Apply external value changes, but skip when the editor already has the
  // same document (e.g. after the user typed and onChange updated the parent).
  useEffect(() => {
    const view = viewRef.current

    if (!view || view.state.doc.toString() === value) {
      return
    }

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: value,
      },
    })
  }, [value])

  return <div ref={hostRef} className={cn('h-full', autoHeight && 'h-auto')} />
}
