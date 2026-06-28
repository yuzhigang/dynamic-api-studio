type SidebarUserMenuProps = {
  name: string
  avatarFallback: string
}

export function SidebarUserMenu({ name, avatarFallback }: SidebarUserMenuProps) {
  return (
    <div className="flex w-full items-center gap-2 px-1 py-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-sm font-semibold text-[#052e5d]">
        {avatarFallback}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</span>
    </div>
  )
}
