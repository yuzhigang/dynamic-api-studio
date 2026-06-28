import type { PropsWithChildren, ReactNode } from 'react'

type AppPageProps = PropsWithChildren<{
  title?: ReactNode
  actions?: ReactNode
}>

export function AppPage({ title, actions, children }: AppPageProps) {
  return (
    <section className="flex h-full min-h-0 flex-col">
      {title || actions ? (
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <div>{title}</div>
          <div>{actions}</div>
        </div>
      ) : null}
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}
