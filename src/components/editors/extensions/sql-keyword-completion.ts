import { autocompletion, type Completion } from '@codemirror/autocomplete'
import type { Extension } from '@codemirror/state'

const keywordOptions: Completion[] = [
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'ORDER BY',
  'GROUP BY',
  'LIMIT',
  'OFFSET',
  'LEFT JOIN',
  'INNER JOIN',
].map((label) => ({ label, type: 'keyword' }))

export function sqlKeywordCompletion(): Extension {
  return autocompletion({
    override: [
      (context) => {
        const word = context.matchBefore(/[A-Za-z ]*/)

        if (!word || word.from === word.to) {
          return null
        }

        return {
          from: word.from,
          options: keywordOptions,
        }
      },
    ],
  })
}
