import { autocompletion, type Completion } from '@codemirror/autocomplete'
import type { Extension } from '@codemirror/state'

const metadataOptions: Completion[] = [
  { label: 'order_main', type: 'class', detail: 'table · 订单主表' },
  { label: 'order_detail', type: 'class', detail: 'table · 订单明细' },
  { label: 'product', type: 'class', detail: 'table · 商品表' },
  { label: 'create_time', type: 'property', detail: 'timestamp' },
  { label: 'customer_name', type: 'property', detail: 'varchar' },
]

export function datasourceCompletion(): Extension {
  return autocompletion({
    activateOnTyping: true,
    override: [
      (context) => {
        const word = context.matchBefore(/[a-zA-Z_][\w.]*/)

        if (!word || word.from === word.to) {
          return null
        }

        return {
          from: word.from,
          options: metadataOptions,
        }
      },
    ],
  })
}
