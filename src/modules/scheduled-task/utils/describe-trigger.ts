import type { Trigger } from '@/shared/contracts/scheduled-task.contract'

const unitLabels: Record<Extract<Trigger, { mode: 'interval' }>['unit'], string> = {
  minute: '分钟',
  hour: '小时',
  day: '天',
}

export function describeTrigger(trigger: Trigger): string {
  if (trigger.mode === 'cron') {
    return `Cron：${trigger.expression}`
  }
  return `每 ${trigger.every} ${unitLabels[trigger.unit]}`
}

export function isValidCron(expression: string): boolean {
  const segments = expression.trim().split(/\s+/)
  return expression.trim().length > 0 && segments.length === 5
}
