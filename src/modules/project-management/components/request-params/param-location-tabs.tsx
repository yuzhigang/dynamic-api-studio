import { TabsList, TabsTrigger } from '@/components/ui/tabs'

export function ParamLocationTabs() {
  return (
    <TabsList className="bg-transparent p-0">
      <TabsTrigger value="query">查询参数</TabsTrigger>
      <TabsTrigger value="body">Body</TabsTrigger>
      <TabsTrigger value="header">Header</TabsTrigger>
    </TabsList>
  )
}
