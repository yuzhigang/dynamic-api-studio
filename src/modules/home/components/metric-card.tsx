import type { ComponentType } from 'react'

import { Card, CardContent } from '@/components/ui/card'

type MetricCardProps = {
  label: string
  value: number
  icon: ComponentType<{ className?: string }>
  suffix?: string
}

export function MetricCard({ label, value, icon: Icon, suffix }: MetricCardProps) {
  return (
    <Card className="bg-white">
      <CardContent className="flex items-center justify-between pt-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {value.toLocaleString()}
            {suffix ? <span className="ml-1 text-sm text-slate-500">{suffix}</span> : null}
          </p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-md bg-blue-50 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}
