import { useState } from 'react'

import { Loader2, Save, Send } from 'lucide-react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useApiDesigner } from '@/modules/project-management/hooks/use-api-designer'
import { useSaveApiDefinition } from '@/modules/project-management/hooks/use-save-api-definition'
import { clearApiDraft } from '@/modules/project-management/utils/api-draft-storage'
import { apiDesignerActions } from '@/modules/project-management/state/api-designer-actions'

type ApiDesignerToolbarProps = {
  disabled?: boolean
}

const isDraftApiId = (id?: string) => Boolean(id && id.startsWith('draft_'))

export function ApiDesignerToolbar({ disabled = false }: ApiDesignerToolbarProps) {
  const { state, dispatch } = useApiDesigner()
  const saveMutation = useSaveApiDefinition()
  const navigate = useNavigate()
  const { projectId = '' } = useParams({ strict: false }) as { projectId?: string }
  const [pendingAction, setPendingAction] = useState<'draft' | 'published' | null>(null)

  const save = (status: 'draft' | 'published') => {
    setPendingAction(status)

    const isDraft = isDraftApiId(state.apiDefinition.id)
    const apiToSave = isDraft
      ? { ...state.apiDefinition, id: undefined, status }
      : { ...state.apiDefinition, status }

    saveMutation.mutate(apiToSave, {
      onSuccess: (result) => {
        toast.success(status === 'draft' ? '草稿已保存' : 'API 已发布')

        if (isDraft && result.id) {
          clearApiDraft(projectId)
          dispatch(apiDesignerActions.updateApiField('id', result.id))
          navigate({
            to: '/projects/$projectId/apis/$apiId',
            params: { projectId, apiId: result.id },
            replace: true,
          })
        }
      },
      onError: (error) => {
        toast.error(status === 'draft' ? '保存草稿失败' : '发布失败', {
          description: error instanceof Error ? error.message : '请稍后重试。',
        })
      },
      onSettled: () => setPendingAction(null),
    })
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
