import { describe, expect, test } from 'bun:test'
import type { Cond } from '@gummy-ui/ui'
import { createFormulaDef, createRuleDef, makeLogicNames } from '../Workspace/logic'
import {
  callAt,
  compareSentence,
  fitsVisual,
  formulaTemplates,
  highlightSpans,
  matchSaved,
  operandType,
  operatorChoice,
  operatorsFor,
  ruleFitsVisual,
  safeDetachCondition,
  sameLogic,
  sampleDefault,
  singleCompare,
  suggestFor,
  valueInputKind,
  withOperator,
  type SuggestCatalog,
  type TypeContext,
} from './model'

const total = { ...createFormulaDef('Total', { op: '*', args: [{ ref: 'field', key: 'Qty' }, { ref: 'field', key: 'Price' }] }) }
const business = {
  ...createRuleDef('Is business', 'boolean'),
  rule: { branches: [{ when: { cmp: 'eq', left: { ref: 'field', key: 'type' }, right: { lit: 'Business' } } as Cond, then: { lit: true } }], else: { lit: false } },
}
const ctx: TypeContext = {
  fields: [
    { name: 'Qty', kind: 'number' },
    { name: 'Price', kind: 'number' },
    { name: 'type', kind: 'text', options: [{ value: 'Business', label: 'Business' }, { value: 'Personal', label: 'Personal' }] },
    { name: 'vip', kind: 'boolean' },
    { name: 'due', kind: 'date' },
  ],
  loads: [{ id: 'load-1', key: 'country', fields: [{ name: 'name', kind: 'string' }, { name: 'population', kind: 'number' }] }],
  rowFields: null,
  formulas: [total],
  rules: [business],
}
const names = makeLogicNames([total], [business], ctx.loads)

describe('operand types', () => {
  test('fields, options, page data, saved items', () => {
    expect(operandType({ ref: 'field', key: 'Qty' }, ctx)).toBe('number')
    expect(operandType({ ref: 'field', key: 'type' }, ctx)).toBe('options')
    expect(operandType({ ref: 'field', key: 'vip' }, ctx)).toBe('boolean')
    expect(operandType({ ref: 'field', key: 'due' }, ctx)).toBe('date')
    expect(operandType({ ref: 'state', key: 'load-1', path: 'population' }, ctx)).toBe('number')
    expect(operandType({ ref: 'state', key: 'load-1', path: '$status' }, ctx)).toBe('options')
    expect(operandType({ formula: total.id }, ctx)).toBe('number')
    expect(operandType({ rule: business.id }, ctx)).toBe('boolean')
    expect(operandType({ ref: 'field', key: 'nope' }, ctx)).toBe('any')
  })
})

describe('operators and value inputs', () => {
  test('filtered by type', () => {
    expect(operatorsFor('boolean').map((o) => o.label)).toEqual(['is on', 'is off', 'is empty'])
    expect(operatorsFor('text').map((o) => o.key)).toContain('contains')
    expect(operatorsFor('number').map((o) => o.key)).not.toContain('contains')
  })
  test('a boolean eq true reads as is on', () => {
    const c: Cond = { cmp: 'eq', left: { ref: 'field', key: 'vip' }, right: { lit: false } }
    if (!('cmp' in c)) throw new Error()
    expect(operatorChoice(c, 'boolean').label).toBe('is off')
  })
  test('the value input fits the type', () => {
    const [is] = operatorsFor('options')
    expect(valueInputKind('options', is, true)).toBe('option')
    expect(valueInputKind('options', operatorsFor('options')[2], true)).toBe('optionList')
    expect(valueInputKind('number', operatorsFor('number')[6], false)).toBe('numberRange')
    expect(valueInputKind('date', operatorsFor('date')[1], false)).toBe('date')
    expect(valueInputKind('boolean', operatorsFor('boolean')[0], false)).toBe('none')
  })
  test('switching operators keeps the value that still fits', () => {
    const c = { cmp: 'eq' as const, left: { ref: 'field' as const, key: 'Qty' }, right: { lit: 5 } }
    expect(withOperator(c, operatorsFor('number')[6], 'number')).toEqual({ cmp: 'between', left: c.left, right: [{ lit: 5 }, { lit: 0 }] })
    expect(withOperator(c, operatorsFor('number')[7], 'number')).toEqual({ cmp: 'empty', left: c.left })
  })
})

describe('sentences', () => {
  test('a comparison in words', () => {
    const c = { cmp: 'in' as const, left: { ref: 'field' as const, key: 'type' }, right: [{ lit: 'Business' }, { lit: 'Personal' }] }
    expect(compareSentence(c, names, ctx).map((p) => p.text)).toEqual(['type', 'is one of', 'Business', 'or', 'Personal'])
    const s = { cmp: 'eq' as const, left: { ref: 'state' as const, key: 'load-1', path: '$status' }, right: { lit: 'success' } }
    expect(compareSentence(s, names, ctx).map((p) => p.text)).toEqual(['country status', 'is', 'loaded'])
  })
  test('single comparisons are found through a one-line group', () => {
    const c: Cond = { cmp: 'eq', left: { ref: 'field', key: 'Qty' }, right: { lit: 1 } }
    expect(singleCompare({ all: [c] })).toEqual(c as never)
    expect(singleCompare({ all: [c, c] })).toBeNull()
  })
})

describe('highlight', () => {
  test('spans by kind, never throwing', () => {
    const text = 'ROUND([Qty] × ((Total)), 2)'
    const tones = highlightSpans(text).map((s) => `${text.slice(s.from, s.to)}:${s.tone}`)
    expect(tones).toEqual(['ROUND:fn', '(:punct', '[Qty]:field', '×:op', '((Total)):saved', ',:punct', '2:value', '):punct'])
    const bad = highlightSpans("[Qty] & 'oops")
    expect(bad[bad.length - 1]).toEqual({ from: 8, to: 13, tone: 'error' })
    expect(highlightSpans('row.x + $country.name').map((s) => s.tone)).toEqual(['data', 'op', 'data'])
  })
})

describe('suggestions', () => {
  const cat: SuggestCatalog = { fields: [{ name: 'Qty', kind: 'number' }, { name: 'Unit price', kind: 'number' }], loads: [{ key: 'country' }], rowFields: [], urlParams: ['code'], formulas: [{ name: 'Total' }], rules: [{ name: 'Is business', resultType: 'boolean' }] }
  test('a plain word offers the right syntax', () => {
    expect(suggestFor('qt', cat)[0]).toMatchObject({ insert: '[Qty]', replace: 2 })
    expect(suggestFor('[Qty] × unit', cat)[0]).toMatchObject({ insert: '[Unit price]', replace: 4 })
    expect(suggestFor('ROU', cat)[0]).toMatchObject({ insert: 'ROUND(', kind: 'fn' })
    expect(suggestFor('tot', cat)[0]).toMatchObject({ insert: '((Total))' })
    expect(suggestFor('busi', cat)[0]).toMatchObject({ insert: 'IF((Is business))' })
  })
  test('not inside text or after a dot', () => {
    expect(suggestFor("'qt", cat)).toEqual([])
    expect(suggestFor('$country.na', cat)).toEqual([])
  })
  test('the explicit triggers still work', () => {
    expect(suggestFor('[un', cat)[0]).toMatchObject({ insert: 'Unit price]' })
    expect(suggestFor('url.c', cat)[0]).toMatchObject({ insert: 'code' })
  })
})

describe('function hint', () => {
  test('the call and argument at the caret', () => {
    expect(callAt('ROUND([Qty] × 2, ', 17)).toMatchObject({ fn: 'ROUND', arg: 1 })
    expect(callAt('ROUND((1 + 2', 12)).toMatchObject({ fn: 'ROUND', arg: 0 })
    expect(callAt("DAYS([a, b], 'x,", 16)).toMatchObject({ fn: 'DAYS', arg: 1 })
    expect(callAt('[Qty] × 2', 9)).toBeNull()
  })
})

describe('templates', () => {
  test('filled from the scope', () => {
    const t = formulaTemplates(ctx)
    expect(t.find((x) => x.key === 'multiply')?.code).toBe('[Qty] × [Price]')
    expect(t.find((x) => x.key === 'days')?.code).toBe('DAYS([due], TODAY())')
    expect(t.find((x) => x.key === 'percent')?.format).toMatchObject({ type: 'percent' })
  })
})

describe('inline ↔ saved', () => {
  test('same logic after normalising', () => {
    expect(sameLogic({ all: [{ cmp: 'eq', left: { key: 'a', ref: 'field' } }] }, { cmp: 'eq', left: { ref: 'field', key: 'a' } })).toBe(true)
    expect(matchSaved({ kind: 'formula', expr: { op: '*', args: [{ ref: 'field', key: 'Qty' }, { ref: 'field', key: 'Price' }] } }, [total], [])?.name).toBe('Total')
    expect(matchSaved({ kind: 'condition', cond: { all: [business.rule.branches[0].when] } }, [], [business])?.name).toBe('Is business')
  })
  test('a saved rule detaches to its condition', () => {
    expect(safeDetachCondition({ rule: business.id }, [business])).toEqual(business.rule.branches[0].when)
    const twoStep = { ...createRuleDef('Two', 'boolean'), rule: { branches: [{ when: { cmp: 'gt', left: { ref: 'field', key: 'Qty' }, right: { lit: 10 } } as Cond, then: { lit: false } }, { when: { cmp: 'eq', left: { ref: 'field', key: 'vip' }, right: { lit: true } } as Cond, then: { lit: true } }], else: { lit: false } } }
    expect(safeDetachCondition({ rule: twoStep.id }, [twoStep])).toEqual({ all: [{ cmp: 'lte', left: { ref: 'field', key: 'Qty' }, right: { lit: 10 } }, { cmp: 'eq', left: { ref: 'field', key: 'vip' }, right: { lit: true } }] })
  })
})

describe('Visual depth', () => {
  const line: Cond = { cmp: 'eq', left: { ref: 'field', key: 'Qty' }, right: { lit: 1 } }
  test('two levels fit, three go to Code', () => {
    expect(fitsVisual({ all: [line, { any: [line, line] }] })).toBe(true)
    expect(fitsVisual({ all: [line, { any: [line, { all: [line] }] }] })).toBe(false)
    expect(ruleFitsVisual({ branches: [{ when: line, then: { branches: [{ when: line, then: { branches: [{ when: line, then: { lit: 1 } }], else: { lit: 0 } } }], else: { lit: 0 } } }], else: { lit: 0 } })).toBe(false)
  })
  test('sample defaults', () => {
    expect(sampleDefault('number', [], 'Qty')).toBe('1')
    expect(sampleDefault('options', [{ value: 'B', label: 'B' }], 'type')).toBe('B')
    expect(sampleDefault('date', [], 'due', new Date('2026-10-30T00:00:00Z'))).toBe('2026-10-30')
  })
})
