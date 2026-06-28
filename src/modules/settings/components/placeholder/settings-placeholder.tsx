type SettingsPlaceholderProps = {
  title: string
}

export function SettingsPlaceholder({ title }: SettingsPlaceholderProps) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="rounded-md border border-dashed border-slate-300 bg-white px-8 py-10 text-center">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="mt-1 text-sm text-slate-500">该设置项正在建设中，敬请期待。</p>
      </div>
    </div>
  )
}
