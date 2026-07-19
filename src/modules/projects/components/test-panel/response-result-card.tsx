import { Copy } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { copyJsonToClipboard } from '@/lib/clipboard'
import { CodeEditorShell } from '@/components/editors/code-editor-shell'
import { JsonCodeViewer } from '@/components/editors/json-code-viewer'
import { useApiDesigner } from '@/modules/projects/hooks/use-api-designer'

export function ResponseResultCard() {
  const { state } = useApiDesigner()
  const result = state.testResult

  const copyResponse = async () => {
    if (!result) return

    try {
      await copyJsonToClipboard(result.response)
      toast.success('响应 JSON 已复制')
    } catch (error) {
      toast.error('复制响应 JSON 失败', {
        description: error instanceof Error ? error.message : '请检查浏览器剪贴板权限。',
      })
    }
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">响应结果</h3>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {result ? <Badge variant="success">状态：{result.statusCode} OK</Badge> : null}
          {result ? <span>耗时：{result.durationMs}ms</span> : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="复制响应 JSON"
                disabled={!result}
                onClick={() => void copyResponse()}
              >
                <Copy aria-hidden="true" className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>复制响应 JSON</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <CodeEditorShell>
        <JsonCodeViewer
          value={
            result?.response ?? {
              code: 0,
              msg: 'success',
              data: {
                list: [],
              },
            }
          }
        />
      </CodeEditorShell>
    </section>
  )
}
