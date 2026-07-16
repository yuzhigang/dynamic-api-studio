import { closePlatformDb, platformDb } from '@/server/infra/db/db'
import { SEED_API_COUNT, SEED_DATASOURCE_COUNT, SEED_INVOCATION_LOG_COUNT, SEED_PROJECT_COUNT, SEED_TASK_COUNT, SEED_VARIABLE_COUNT, seedDemoData } from '@/server/infra/db/seed'

async function main(): Promise<void> {
  await seedDemoData(platformDb)
  console.log(
    `[seed] 已写入 ${SEED_PROJECT_COUNT} 个项目 + ${SEED_DATASOURCE_COUNT} 个数据源 + ${SEED_VARIABLE_COUNT} 个变量 + ${SEED_API_COUNT} 个 API + ${SEED_TASK_COUNT} 个任务 + ${SEED_INVOCATION_LOG_COUNT} 条调用日志（幂等 upsert）`,
  )
}

main()
  .catch((error) => {
    console.error('[seed] 失败：', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closePlatformDb()
  })