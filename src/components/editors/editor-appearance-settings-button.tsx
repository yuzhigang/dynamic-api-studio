import { Settings2 } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { EditorAppearanceControls } from '@/components/editors/editor-appearance-controls'

const HOVER_LEAVE_DELAY_MS = 150

export function EditorAppearanceSettingsButton() {
  const [open, setOpen] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const scheduleClose = () => {
    cancelClose()
    closeTimerRef.current = setTimeout(() => {
      setOpen(false)
    }, HOVER_LEAVE_DELAY_MS)
  }

  const handleEnter = () => {
    cancelClose()
    setOpen(true)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label="编辑器风格设置"
          onMouseEnter={handleEnter}
          onMouseLeave={scheduleClose}
        >
          <Settings2 aria-hidden="true" className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={4}
        onMouseEnter={handleEnter}
        onMouseLeave={scheduleClose}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className="mb-2 text-sm font-medium text-slate-900">编辑器风格</div>
        <EditorAppearanceControls />
      </PopoverContent>
    </Popover>
  )
}
