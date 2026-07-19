import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ProjectApiNewTestDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultName: string
  onConfirm: (name: string) => void
}

export function ProjectApiNewTestDialog({
  open,
  onOpenChange,
  defaultName,
  onConfirm,
}: ProjectApiNewTestDialogProps) {
  const [name, setName] = useState(defaultName)

  useEffect(() => {
    if (open) {
      setName(defaultName)
    }
  }, [open, defaultName])

  const handleConfirm = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }

    onConfirm(trimmed)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新建测试</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault()
            handleConfirm()
          }}
        >
          <Label htmlFor="new-test-name">测试名称</Label>
          <Input
            id="new-test-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="请输入测试名称"
            autoComplete="off"
            autoFocus
          />
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              确定
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
