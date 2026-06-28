import { useNavigate } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useDeleteDataSource } from '@/modules/data-source/hooks/use-delete-data-source'
import type { DataSource } from '@/shared/contracts/data-source.contract'

type DeleteDataSourceDialogProps = {
  dataSource: DataSource
}

export function DeleteDataSourceDialog({ dataSource }: DeleteDataSourceDialogProps) {
  const navigate = useNavigate()
  const mutation = useDeleteDataSource()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={mutation.isPending}>
          <Trash2 className="mr-1.5 h-4 w-4" />
          删除数据源
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除数据源</AlertDialogTitle>
          <AlertDialogDescription>
            确认删除数据源「{dataSource.name}」？此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() =>
              mutation.mutate(dataSource.id, {
                onSuccess: () => navigate({ to: '/datasources' }),
              })
            }
          >
            删除数据源
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
