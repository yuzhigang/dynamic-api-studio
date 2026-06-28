import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import { CodeMirrorEditor } from './code-mirror-editor'

describe('CodeMirrorEditor', () => {
  it('does not recreate editor when parent re-renders with new callback and symbol references', () => {
    const { rerender, container } = render(
      <CodeMirrorEditor value="initial" language="sql" symbols={[]} onChange={() => {}} />,
    )

    const contentBefore = container.querySelector('.cm-content')
    expect(contentBefore).toBeTruthy()

    // Re-render with new inline function and a new symbols array reference,
    // which is exactly what happens in normal React parent components.
    rerender(
      <CodeMirrorEditor
        value="initial"
        language="sql"
        symbols={[{ label: '$x', detail: 'string', source: 'input' }]}
        onChange={() => {}}
      />,
    )

    const contentAfter = container.querySelector('.cm-content')
    expect(contentAfter).toBe(contentBefore)
  })

  it('highlights SQL keywords', () => {
    const { container } = render(
      <CodeMirrorEditor value="SELECT id FROM users" language="sql" symbols={[]} onChange={() => {}} />,
    )

    // CodeMirror wraps highlighted tokens in <span> elements. The exact class
    // names are hashed by the default highlight style, so we just assert that
    // tokens are wrapped.
    const content = container.querySelector('.cm-content')
    expect(content?.querySelectorAll('span').length).toBeGreaterThan(0)
  })

  it('does not recreate editor when the controlled value prop changes', () => {
    const { rerender, container } = render(
      <CodeMirrorEditor value="initial" language="sql" symbols={[]} onChange={() => {}} />,
    )

    const contentBefore = container.querySelector('.cm-content')
    expect(contentBefore).toBeTruthy()

    // In a real parent component, typing triggers onChange -> parent state
    // update -> new value prop. The editor must stay the same instance.
    rerender(
      <CodeMirrorEditor value="initial changed" language="sql" symbols={[]} onChange={() => {}} />,
    )

    const contentAfter = container.querySelector('.cm-content')
    expect(contentAfter).toBe(contentBefore)
  })
})
