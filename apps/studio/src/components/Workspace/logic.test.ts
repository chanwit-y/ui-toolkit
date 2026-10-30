import { describe, expect, test } from 'bun:test'
import type { Expr } from '@gummy-ui/ui'
import {
  countFieldRefs,
  renameFieldRefs,
  conditionIssues,
  createFormulaDef,
  createRuleDef,
  formulaToDataValue,
  inlineFormula,
  libraryIssues,
  LOGIC_PRESETS,
  migrateItemConditions,
  lexemes,
  joinLexemes,
  leftToRight,
  mixesPrecedence,
  logicLibraryToEngine,
  logicToEngine,
  makeLogicNames,
  parseCondition,
  parseExpr,
  printCondition,
  printExpr,
  type StudioCondition,
} from './logic'

const subtotal = { ...createFormulaDef('Subtotal', { op: '*', args: [{ ref: 'field', key: 'qty' }, { ref: 'field', key: 'price' }] }), id: 'formula-sub' }
const business = { ...createRuleDef('Is business'), id: 'rule-biz' }
const names = makeLogicNames([subtotal], [business], [{ id: 'load-1', key: 'country' }])

describe('printing and parsing', () => {
  const roundTrip = (text: string) => {
    const parsed = parseExpr(text, names)
    if (parsed.error) throw new Error(`${parsed.error} at ${parsed.at}`)
    return printExpr(parsed.value, names)
  }

  test('formulas round-trip through Code mode', () => {
    expect(roundTrip('[Qty] * [Unit price]')).toBe('[Qty] × [Unit price]')
    expect(roundTrip('(1 + 2) × 3')).toBe('(1 + 2) × 3')
    expect(roundTrip('1 - (2 - 3)')).toBe('1 − (2 − 3)')
    expect(roundTrip('((Subtotal)) * (1 - IF((Is business)))')).toBe('((Subtotal)) × (1 − IF((Is business)))')
    expect(roundTrip("ROUND($country.population / [area], 1) & ' /km²'")).toBe("ROUND($country.population ÷ [area], 1) & ' /km²'")
    expect(roundTrip('DAYS(row.joined_at, TODAY())')).toBe('DAYS(row.joined_at, TODAY())')
    expect(roundTrip('url.code & query.tab')).toBe('url.code & query.tab')
    // `((` right after a bracket is a bracket, then the saved reference.
    expect(roundTrip('ROUND(((Subtotal)), 2)')).toBe('ROUND(((Subtotal)), 2)')
    expect(roundTrip('((1 + 2)) * 3')).toBe('(1 + 2) × 3')
    expect(roundTrip('(([a] + 1)) * 3')).toBe('([a] + 1) × 3')
  })

  test('% literals, negatives, booleans, empty', () => {
    expect(parseExpr('15%', names).value).toEqual({ lit: 0.15 })
    expect(parseExpr('-5', names).value).toEqual({ lit: -5 })
    expect(parseExpr('TRUE', names).value).toEqual({ lit: true })
    expect(parseExpr('EMPTY', names).value).toEqual({ lit: null })
  })

  test('references resolve to ids; unknown names are errors with a position', () => {
    expect(parseExpr('((Subtotal))', names).value).toEqual({ formula: 'formula-sub' })
    expect(parseExpr('$country.name', names).value).toEqual({ ref: 'state', key: 'load-1', path: 'name' })
    const bad = parseExpr('[a] + ((Nope))', names)
    expect(bad.error).toContain('Nope')
    expect(bad.at).toBe(6)
    expect(parseExpr('[a] +', names).error).toBeTruthy()
    expect(parseExpr('qty + 1', names).error).toContain('[Name]')
  })

  test('conditions round-trip', () => {
    const rt = (text: string) => {
      const p = parseCondition(text, names)
      if (p.error) throw new Error(`${p.error} at ${p.at}`)
      return printCondition(p.value, names)
    }
    expect(rt("[type] = 'Business' AND ([n] > 5 OR [x] IS EMPTY)")).toBe("[type] = 'Business' AND ([n] > 5 OR [x] IS EMPTY)")
    expect(rt("[r] IN ('TH', 'ID')")).toBe("[r] IN ('TH', 'ID')")
    expect(rt('[n] BETWEEN 1 AND 10 AND [m] >= 2')).toBe('[n] BETWEEN 1 AND 10 AND [m] ≥ 2')
    expect(rt('(1 + [a]) * 2 > 4')).toBe('(1 + [a]) × 2 > 4')
    expect(parseCondition('IF((Is business))', names).value).toEqual({ rule: 'rule-biz' })
    expect(rt('IF((Is business)) AND [a] IS NOT EMPTY')).toBe('IF((Is business)) = TRUE AND [a] IS NOT EMPTY')
  })
})

describe('export', () => {
  test('ids become names, loads keys, $table the table', () => {
    const c: StudioCondition = { all: [LOGIC_PRESETS.adding(), LOGIC_PRESETS.loadStatus('load-1', 'success'), { cmp: 'gt', left: { formula: 'formula-sub' }, right: { lit: 5 } }] }
    expect(logicToEngine(c, names, { tableName: 'dtCountry' })).toEqual({
      all: [
        { cmp: 'empty', left: { ref: 'row', key: 'dtCountry', path: '_id' } },
        { cmp: 'eq', left: { ref: 'state', key: 'country', path: '$status' }, right: { lit: 'success' } },
        { cmp: 'gt', left: { formula: 'Subtotal' }, right: { lit: 5 } },
      ],
    })
    expect(logicToEngine({ rule: 'gone' }, names)).toEqual({ rule: 'MISSING_RULE' })
  })

  test('a value slot exports a formula DataValue', () => {
    expect(formulaToDataValue({ formulaId: 'formula-sub' }, names)).toEqual({ type: 'formula', key: 'none', formula: 'Subtotal' })
    const inline = { ...inlineFormula({ lit: 1 } as Expr), onEmpty: 'zero' as const }
    inline.format = { ...inline.format, type: 'number', decimals: 2 }
    expect(formulaToDataValue(inline, names)).toEqual({ type: 'formula', key: 'none', expr: { lit: 1 }, format: { type: 'number', decimals: 2 }, onEmpty: 'zero' })
  })

  test('the library exports by name, skipping blank / duplicate names', () => {
    const out = logicLibraryToEngine([subtotal, { ...createFormulaDef(''), id: 'f2' }, { ...createFormulaDef('Subtotal'), id: 'f3' }], [business])
    expect(Object.keys(out.formulas!)).toEqual(['Subtotal'])
    expect(out.rules!['Is business'].resultType).toBe('boolean')
    expect(logicLibraryToEngine()).toEqual({})
  })
})

describe('checks', () => {
  test('library issues: blank names, deleted refs, cycles, branch types', () => {
    const a = { ...createFormulaDef('A', { formula: 'f-b' }), id: 'f-a' }
    const b = { ...createFormulaDef('B', { formula: 'f-a' }), id: 'f-b' }
    const bad = { ...createRuleDef('Typed', 'number'), id: 'r-t' }
    bad.rule = { branches: [{ when: { all: [] }, then: { lit: 'oops' } }], else: { formula: 'f-gone' } }
    const issues = libraryIssues([a, b, { ...createFormulaDef(''), id: 'f-c' }], [bad]).map((i) => `${i.where}: ${i.message}`)
    expect(issues).toContain('formula: has a blank name')
    expect(issues.some((i) => i.startsWith('A: refers to itself'))).toBe(true)
    expect(issues).toContain('rule Typed: uses a deleted formula')
    expect(issues).toContain('rule Typed: a THEN gives text, but the rule gives number')
  })

  test('a condition slot needs a boolean rule', () => {
    const num = { ...createRuleDef('Rate', 'number'), id: 'r-n' }
    expect(conditionIssues({ rule: 'r-n' }, [num], [], 'Show when')[0].message).toContain('gives number')
    expect(conditionIssues({ rule: 'x' }, [num], [], 'Show when')[0].message).toBe('uses a deleted rule')
    expect(conditionIssues({ rule: 'rule-biz' }, [business], [], 'Show when')).toEqual([])
  })
})

describe('v60 migration', () => {
  test('showWhen + dataWhen become one condition, through child canvases', () => {
    const items = [
      { showWhen: 'adding' as const, dataWhen: { loadId: 'load-1', test: 'loaded' as const, path: '', op: 'eq' as const, value: '' } },
      { dataWhen: { loadId: '$item', test: 'compare' as const, path: 'featured', op: 'eq' as const, value: 'true' } },
      { dataWhen: { loadId: 'load-1', test: 'compare' as const, path: 'role', op: 'unset' as const, value: '' } },
      { showWhen: 'always' as const, childCanvases: [{ items: [{ showWhen: 'editing' as const }] }] },
    ]
    migrateItemConditions(items as never[])
    const [a, b, c, d] = items as Array<Record<string, unknown>>
    expect(a.condition).toEqual({ all: [LOGIC_PRESETS.adding(), LOGIC_PRESETS.loadStatus('load-1', 'success')] })
    expect(b.condition).toEqual({ cmp: 'eq', left: { ref: 'row', key: 'featured' }, right: { lit: true } })
    expect(c.condition).toEqual({ cmp: 'empty', left: { ref: 'state', key: 'load-1', path: 'role' } })
    expect(d.condition).toBeUndefined()
    expect('showWhen' in d).toBe(false)
    expect((d.childCanvases as { items: Record<string, unknown>[] }[])[0].items[0].condition).toEqual(LOGIC_PRESETS.editing())
    expect('dataWhen' in a).toBe(false)
  })
})

describe('visual tokens', () => {
  test('lexemes keep the written text; joinLexemes spaces like the printer', () => {
    const l = lexemes("ROUND([a] * 2, 1) & ' x'")!
    expect(l.map((x) => x.kind)).toEqual(['fn', 'paren', 'field', 'op', 'value', 'comma', 'value', 'paren', 'op', 'value'])
    expect(joinLexemes(l)).toBe("ROUND([a] * 2, 1) & ' x'")
    expect(lexemes('[a')).toBeNull()
  })

  test('precedence check and the left-to-right reading', () => {
    expect(mixesPrecedence('1 + 2 * 3')).toBe(true)
    expect(mixesPrecedence('(1 + 2) * 3')).toBe(false)
    const flat = leftToRight('1 + 2 * 3', names)!
    expect(printExpr(flat, names)).toBe('(1 + 2) × 3')
    expect(printExpr(parseExpr('1 + 2 * 3', names).value!, names)).toBe('1 + 2 × 3')
  })
})

describe('field renames', () => {
  const items = [
    { id: 'a', config: { name: 'qty' }, condition: { cmp: 'gt', left: { ref: 'field', key: 'qty' }, right: { lit: 0 } } },
    { id: 'b', childCanvases: [{ items: [{ id: 'c', valueFormula: { expr: { op: '*', args: [{ ref: 'field', key: 'qty' }, { ref: 'field', key: 'price' }] } } }] }] },
    { id: 'd', condition: { cmp: 'eq', left: { ref: 'state', key: 'qty' }, right: { lit: 1 } } },
  ]
  test('counts and renames only field references', () => {
    expect(countFieldRefs(items, 'qty')).toBe(2)
    const next = renameFieldRefs(items, 'qty', 'quantity')
    expect(countFieldRefs(next, 'qty')).toBe(0)
    expect(countFieldRefs(next, 'quantity')).toBe(2)
    expect(next[0].config).toEqual({ name: 'qty' })
    expect(next[2]).toBe(items[2])
    expect(renameFieldRefs(items, 'nope', 'x')).toBe(items)
  })
})
