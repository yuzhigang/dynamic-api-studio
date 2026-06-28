import { Copy } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { copyJsonToClipboard } from '@/lib/clipboard'
import { CodeEditorShell } from '@/components/editors/code-editor-shell'
import { JsonCodeViewer } from '@/components/editors/json-code-viewer'
import { useApiDesigner } from '@/modules/project-management/hooks/use-api-designer'

export function RequestPreviewCard() {
  const { state } = useApiDesigner()

  const copyRequest = async () => {
    try {
      await copyJsonToClipboard(state.testParams)
      toast.success('请求 JSON 已复制')
    } catch (error) {
      toast.error('复制请求 JSON 失败', {
        description: error instanceof Error ? error.message : '请检查浏览器剪贴板权限。',
      })
    }
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">请求预览</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="复制请求 JSON"
              onClick={() => void copyRequest()}
            >
              <Copy aria-hidden="true" className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>复制请求 JSON</TooltipContent>
        </Tooltip>
      </div>
      <CodeEditorShell>
        <JsonCodeViewer value={state.testParams} />
      </CodeEditorShell>
    </section>
  )
}
