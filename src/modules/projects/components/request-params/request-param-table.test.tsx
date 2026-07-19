import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { RequestParamTable } from '@/modules/projects/components/request-params/request-param-table'
import { ApiDesignerProvider } from '@/modules/projects/state/api-designer-context'
import { createEmptyApiDefinition } from '@/shared/api-definition/create-empty-api-definition'

function renderTable() {
  const initialApiDefinition = createEmptyApiDefinition({
    requestParams: [
      {
        id: 'param-page-no',
        name: 'pageNo',
        location: 'body',
        type: 'integer',
        required: true,
        example: '1',
        description: '页码',
      },
    ],
  })

  return render(
    <TooltipProvider>
      <ApiDesignerProvider initialApiDefinition={initialApiDefinition}>
        <RequestParamTable location="body" />
      </ApiDesignerProvider>
    </TooltipProvider>,
  )
}

describe('RequestParamTable', () => {
  it('labels editable controls with the parameter name', () => {
    renderTable()

    expect(screen.getByRole('textbox', { name: '参数 pageNo 的名称' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: '参数 pageNo 的类型' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: '参数 pageNo 是否必填' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '删除参数 pageNo' })).toBeTruthy()
  })

  it('removes a parameter only after confirmation', async () => {
    renderTable()

    fireEvent.click(screen.getByRole('button', { name: '删除参数 pageNo' }))
    expect(screen.getByRole('alertdialog')).toBeTruthy()
    expect(screen.getByText('确认删除参数「pageNo」？此操作无法撤销。')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '删除参数' }))
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '删除参数 pageNo' })).toBeNull()
    })
  })
})
