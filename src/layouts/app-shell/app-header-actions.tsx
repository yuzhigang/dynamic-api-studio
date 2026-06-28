import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

type AppHeaderSlotContextValue = {
  slot: HTMLElement | null
  setSlot: (element: HTMLElement | null) => void
}

const AppHeaderSlotContext = createContext<AppHeaderSlotContextValue>({
  slot: null,
  setSlot: () => {},
})

/**
 * 提供顶部 Header 右侧操作区的挂载点。包裹 AppHeader 与页面内容，
 * 让页面可以通过 AppHeaderActions 把操作按钮投射到面包屑同一行。
 */
export function AppHeaderSlotProvider({ children }: PropsWithChildren) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)

  return (
    <AppHeaderSlotContext.Provider value={{ slot, setSlot }}>
      {children}
    </AppHeaderSlotContext.Provider>
  )
}

/** 在 AppHeader 中渲染的右侧操作容器（投射目标）。 */
export function AppHeaderSlotTarget({ className }: { className?: string }) {
  const { setSlot } = useContext(AppHeaderSlotContext)

  return <div ref={setSlot} className={className} />
}

/**
 * 把 children 投射到顶部 Header 右侧操作区。借助 React Portal，
 * children 在 React 组件树上仍位于调用处（保留所在的 Context），
 * 仅在 DOM 上渲染到 Header。
 */
export function AppHeaderActions({ children }: { children: ReactNode }) {
  const { slot } = useContext(AppHeaderSlotContext)

  if (!slot) {
    return null
  }

  return createPortal(children, slot)
}
