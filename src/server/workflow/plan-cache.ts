import { createHash } from 'node:crypto'

import type { EnhancedSqlAnalyzer } from '@/server/analyzer'
import type { AnalyzeInput, CompiledSqlPlan } from '@/server/analyzer/types'
import type { WorkflowStep } from '@/shared/schemas/api-definition.schema'
import type { DataSource } from '@/shared/contracts/data-source.contract'
import { mapParserDialect } from '@/server/workflow/datasource-config'

export type WorkflowSymbols = {
  inputNames: string[]
  globalNames: string[]
  localNames: string[]
  defaults: Record<string, unknown>
}

export type PlanCompileContext = { dataSource: DataSource }

type CacheEntry = { plan: CompiledSqlPlan; sourceHash: string; schemaHash: string }

const DEFAULT_MAX = 1000

export class PlanCache {
  private readonly entries = new Map<string, CacheEntry>()
  private readonly max: number

  constructor(private readonly analyzer: EnhancedSqlAnalyzer, max = DEFAULT_MAX) {
    this.max = max
  }

  getOrCompile(step: WorkflowStep, symbols: WorkflowSymbols, ctx: PlanCompileContext): CompiledSqlPlan {
    const sourceHash = sha256(step.sql ?? '')
    const key = `${step.id}:${sourceHash}`
    const cached = this.entries.get(key)

    if (cached && cached.schemaHash === currentSchemaHash(symbols)) {
      this.touch(key)
      return cached.plan
    }

    const plan = this.compile(step, symbols, ctx)
    this.entries.set(key, { plan, sourceHash, schemaHash: currentSchemaHash(symbols) })
    this.evictIfNeeded()
    return plan
  }

  invalidate(stepId: string): void {
    for (const key of Array.from(this.entries.keys())) {
      if (key.startsWith(`${stepId}:`)) this.entries.delete(key)
    }
  }

  private compile(step: WorkflowStep, symbols: WorkflowSymbols, ctx: PlanCompileContext): CompiledSqlPlan {
    const input: AnalyzeInput = {
      sql: step.sql ?? '',
      dialect: mapParserDialect(ctx.dataSource.dialect),
      inputNames: symbols.inputNames,
      globalNames: symbols.globalNames,
      localNames: symbols.localNames,
      defaults: symbols.defaults,
    }
    return this.analyzer.analyze(input)
  }

  private touch(key: string): void {
    const entry = this.entries.get(key)
    if (!entry) return
    this.entries.delete(key)
    this.entries.set(key, entry)
  }

  private evictIfNeeded(): void {
    while (this.entries.size > this.max) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) break
      this.entries.delete(oldest)
    }
  }
}

function currentSchemaHash(symbols: WorkflowSymbols): string {
  return sha256(JSON.stringify({
    inputNames: symbols.inputNames,
    globalNames: symbols.globalNames,
    localNames: symbols.localNames,
    defaults: symbols.defaults,
  }))
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}