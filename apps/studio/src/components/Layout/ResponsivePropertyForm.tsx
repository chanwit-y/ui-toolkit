import { useState } from 'react'
import { Input, Select } from '../common'
import { MAX_GRID_COLUMNS, type Breakpoint } from './breakpoints'
import { BreakpointSelector } from './BreakpointSelector'
import { BREAKPOINT_LABELS, type PropertyField } from './gridProperties'
import { SpanButtons } from './SpanButtons'
import type { Responsive } from './types'

type ResponsiveValues = Record<string, Responsive<string | number>>

type ResponsivePropertyFormProps = {
  title: string
  fields: PropertyField[]
  values: ResponsiveValues
  maxColumns?: number
  getMaxColumns?: (breakpoint: Breakpoint) => number
  defaultBreakpoint?: Breakpoint
  onChange: (
    breakpoint: Breakpoint,
    key: string,
    value: string,
    animate?: boolean,
  ) => void
}

/**
 * Discrete controls (selects, span buttons) commit once per interaction, so
 * they animate. Free-text inputs fire per keystroke, so they update without a
 * FLIP (fix #3) and let CSS transitions smooth the change.
 */
function fieldAnimates(field: PropertyField): boolean {
  return (
    field.type === 'select' ||
    field.type === 'number-select' ||
    field.type === 'span-buttons'
  )
}

export function ResponsivePropertyForm({
  title,
  fields,
  values,
  maxColumns = 12,
  getMaxColumns,
  defaultBreakpoint = 'xs',
  onChange,
}: ResponsivePropertyFormProps) {
  const [activeBp, setActiveBp] = useState<Breakpoint>(defaultBreakpoint)

  const columnLimit = getMaxColumns?.(activeBp) ?? maxColumns

  const getOptionsForField = (field: PropertyField) => {
    if (field.key === 'columns' || field.key === 'colSpan') {
      const max = Math.min(columnLimit, field.max ?? 12)
      return Array.from({ length: max }, (_, i) => {
        const n = String(i + 1)
        return { value: n, label: n }
      })
    }
    if (field.key === 'colStart') {
      const max = Math.min(columnLimit, 12)
      return [
        { value: '0', label: 'auto' },
        ...Array.from({ length: max }, (_, i) => {
          const n = String(i + 1)
          return { value: n, label: n }
        }),
      ]
    }
    return field.options ?? []
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>

      <div className="rounded-lg bg-zinc-100 p-1">
        <BreakpointSelector value={activeBp} onChange={setActiveBp} />
      </div>

      <p className="text-xs text-zinc-500">{BREAKPOINT_LABELS[activeBp]}</p>

      <div className="space-y-2.5">
        {fields.map((field) => {
          const fieldValues = values[field.key]
          const rawValue = fieldValues?.[activeBp]
          const value =
            rawValue === undefined || rawValue === null ? '' : String(rawValue)

          return (
            <label key={`${field.key}-${activeBp}`} className="block space-y-1">
              <span className="font-mono text-xs text-zinc-600">
                {field.label}
                <span className="ml-1 text-violet-600">@{activeBp}</span>
              </span>
              {field.type === 'span-buttons' ? (
                <SpanButtons
                  value={value}
                  max={Math.min(columnLimit, field.max ?? MAX_GRID_COLUMNS)}
                  onSelect={(span) =>
                    onChange(activeBp, field.key, span, fieldAnimates(field))
                  }
                />
              ) : field.type === 'select' || field.type === 'number-select' ? (
                <Select
                  options={getOptionsForField(field)}
                  value={value}
                  onChange={(v) => onChange(activeBp, field.key, v, fieldAnimates(field))}
                />
              ) : (
                <Input
                  value={value}
                  placeholder={field.placeholder}
                  className="font-mono"
                  onChange={(e) =>
                    onChange(activeBp, field.key, e.target.value, fieldAnimates(field))
                  }
                />
              )}
              {field.hint ? (
                <span className="block text-xs text-zinc-400">{field.hint}</span>
              ) : null}
            </label>
          )
        })}
      </div>
    </div>
  )
}
