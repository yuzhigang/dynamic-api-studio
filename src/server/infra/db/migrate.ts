import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { FileMigrationProvider, Migrator, NO_MIGRATIONS } from 'kysely/migration'

import { closePlatformDb } from '@/server/infra/db/db'
import { platformDb as db } from '@/server/infra/db/db'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsFolder = path.join(dirname, 'migrations')

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: migrationsFolder,
    // Windows 上默认 `import()` 不接受裸盘符路径（`D:\...`），
    // 需转成 `file://` URL；tsx 的 loader 据此解析 `.ts`。
    import: (filePath) => import(pathToFileURL(filePath).href),
  }),
})

function printResults(results: ReadonlyArray<{ migrationName: string; status: string }> | undefined): void {
  if (!results || results.length === 0) {
    console.log('（无迁移需要执行）')
    return
  }
  for (const r of results) {
    if (r.status === 'Success') {
      console.log(`  ✓ ${r.migrationName}`)
    } else if (r.status === 'Error') {
      console.error(`  ✗ ${r.migrationName}（失败）`)
    } else {
      console.log(`  · ${r.migrationName}（${r.status}）`)
    }
  }
}

async function runUp(): Promise<void> {
  const { error, results } = await migrator.migrateToLatest()
  printResults(results)
  if (error) {
    console.error('\n迁移失败：')
    console.error(error)
    process.exitCode = 1
  }
}

async function runStatus(): Promise<void> {
  const migrations = await migrator.getMigrations()
  if (migrations.length === 0) {
    console.log('（无可用迁移）')
    return
  }
  for (const m of migrations) {
    const executedAt = (m as { executedAt?: unknown }).executedAt
    if (executedAt) {
      console.log(`  [已执行] ${m.name}`)
    } else {
      console.log(`  [待执行] ${m.name}`)
    }
  }
}

async function runRollback(): Promise<void> {
  const { error, results } = await migrator.migrateTo(NO_MIGRATIONS)
  printResults(results)
  if (error) {
    console.error('\n回滚失败：')
    console.error(error)
    process.exitCode = 1
  }
}

async function runMake(name: string | undefined): Promise<void> {
  if (!name) {
    console.error('用法：pnpm db:migrate:make <name>')
    process.exitCode = 1
    return
  }
  const stamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, '')
    .replace(/\..+/, '')
  const fileName = `${stamp}_${name}.ts`
  const filePath = path.join(migrationsFolder, fileName)
  const template = `import type { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // TODO: 实现 ${name} 迁移
}

export async function down(db: Kysely<any>): Promise<void> {
  // TODO: 回滚 ${name} 迁移
}
`
  await fs.writeFile(filePath, template, 'utf8')
  console.log(`已创建迁移文件：${filePath}`)
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? 'status'

  switch (command) {
    case 'up':
      await runUp()
      break
    case 'status':
      await runStatus()
      break
    case 'rollback':
      await runRollback()
      break
    case 'make':
      await runMake(process.argv[3])
      break
    default:
      console.error(`未知命令：${command}`)
      console.error('可用命令：up | status | rollback | make <name>')
      process.exitCode = 1
  }

  await closePlatformDb()
}

main().catch((error) => {
  console.error(error)
  closePlatformDb().finally(() => {
    process.exit(1)
  })
})