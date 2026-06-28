import { Loader2, Save, Send } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useSaveApiDefinition } from '@/modules/project-management/hooks/use-save-api-definition'
import { useApiDesigner } from '@/modules/project-management/hooks/use-api-designer'

type ApiDesignerToolbarProps = {
  disabled?: boolean
}

export function ApiDesignerToolbar({ disabled = false }: ApiDesignerToolbarProps) {
  const { state } = useApiDesigner()
  const saveMutation = useSaveApiDefinition()
  const [pendingAction, setPendingAction] = useState<'draft' | 'published' | null>(null)

  const save = (status: 'draft' | 'published') => {
    setPendingAction(status)
    saveMutation.mutate(
      { ...state.apiDefinition, status },
      {
        onSuccess: () => toast.success(status === 'draft' ? '草稿已保存' : 'API 已发布'),
        onError: (error) => {
          toast.error(status === 'draft' ? '保存草稿失败' : '发布失败', {
            description: error instanceof Error ? error.message : '请稍后重试。',
          })
        },
        onSettled: () => setPendingAction(null),
      },
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        type="button"
        onClick={() => save('draft')}
        disabled={disabled || saveMutation.isPending}
      >
        {pendingAction === 'draft' ? (
          <Loader2 aria-hidden="true" className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Save aria-hidden="true" className="mr-1.5 h-4 w-4" />
        )}
        {pendingAction === 'draft' ? '保存中…' : '保存草稿'}
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={() => save('published')}
        disabled={disabled || saveMutation.isPending}
      >
        {pendingAction === 'published' ? (
          <Loader2 aria-hidden="true" className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Send aria-hidden="true" className="mr-1.5 h-4 w-4" />
        )}
        {pendingAction === 'published' ? '发布中…' : '发布'}
      </Button>
    </div>
  )
}
