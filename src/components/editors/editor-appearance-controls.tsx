import { useState } from 'react'

import { CompactField } from '@/components/common/compact-field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { defaultEditorAppearance } from '@/components/editors/editor-appearance'
import { useEditorAppearance } from '@/components/editors/use-editor-appearance'

const FONT_FAMILY_OPTIONS = [
  {
    label: 'JetBrains Mono',
    value: '"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  },
  { label: 'Fira Code', value: '"Fira Code", Consolas, monospace' },
  { label: 'SF Mono', value: '"SFMono-Regular", Consolas, monospace' },
  { label: 'Consolas', value: 'Consolas, "Liberation Mono", Menlo, monospace' },
  { label: '自定义', value: 'custom' },
]

const FONT_SIZE_OPTIONS = ['12px', '13px', '14px', '15px', '16px']
const LINE_HEIGHT_OPTIONS = ['1.4', '1.5', '1.6', '1.8']

export function EditorAppearanceControls() {
  const { preference, setPreference } = useEditorAppearance()

  const currentFontFamily = preference.fontFamily ?? defaultEditorAppearance.fontFamily
  const matchedFontOption = FONT_FAMILY_OPTIONS.find((option) => option.value === currentFontFamily)
  const [fontFamilyMode, setFontFamilyMode] = useState(matchedFontOption ? matchedFontOption.value : 'custom')
  const [customFontFamily, setCustomFontFamily] = useState(currentFontFamily)

  const handleFontFamilyChange = (value: string) => {
    setFontFamilyMode(value)
    if (value === 'custom') {
      setPreference({ fontFamily: customFontFamily })
    } else {
      setPreference({ fontFamily: value })
    }
  }

  const handleCustomFontFamilyChange = (value: string) => {
    setCustomFontFamily(value)
    if (fontFamilyMode === 'custom') {
      setPreference({ fontFamily: value })
    }
  }

  return (
    <div className="space-y-4">
      <CompactField htmlFor="colorScheme" label="配色方案">
        <Select
          value={preference.colorScheme ?? 'light'}
          onValueChange={(value) => setPreference({ colorScheme: value as 'light' | 'dark' })}
        >
          <SelectTrigger id="colorScheme">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">浅色</SelectItem>
            <SelectItem value="dark">深色</SelectItem>
          </SelectContent>
        </Select>
      </CompactField>

      <CompactField htmlFor="fontFamily" label="字体">
        <div className="space-y-2">
          <Select value={fontFamilyMode} onValueChange={handleFontFamilyChange}>
            <SelectTrigger id="fontFamily">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fontFamilyMode === 'custom' ? (
            <Input
              value={customFontFamily}
              onChange={(event) => handleCustomFontFamilyChange(event.target.value)}
              placeholder='例如 "Fira Code", monospace'
            />
          ) : null}
        </div>
      </CompactField>

      <CompactField htmlFor="fontSize" label="字号">
        <Select
          value={preference.fontSize ?? defaultEditorAppearance.fontSize}
          onValueChange={(value) => setPreference({ fontSize: value })}
        >
          <SelectTrigger id="fontSize">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={size}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CompactField>

      <CompactField htmlFor="lineHeight" label="行高">
        <Select
          value={preference.lineHeight ?? defaultEditorAppearance.lineHeight}
          onValueChange={(value) => setPreference({ lineHeight: value })}
        >
          <SelectTrigger id="lineHeight">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LINE_HEIGHT_OPTIONS.map((height) => (
              <SelectItem key={height} value={height}>
                {height}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CompactField>
    </div>
  )
}
