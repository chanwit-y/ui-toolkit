import { describe, expect, test } from 'bun:test'
import { dataConditionValue } from './gridConfig'
import { ITEM_CONDITION_SOURCE, type DataCondition } from './types'

const refs = { loadKey: (id: string) => (id === 'load-me' ? 'me' : 'MISSING_LOAD') }
const cond = (patch: Partial<DataCondition>): DataCondition => ({ loadId: 'load-me', test: 'compare', path: '', op: 'eq', value: '', ...patch })

describe('dataConditionValue', () => {
  test('a page-load field compares through the state slice', () => {
    expect(dataConditionValue(cond({ path: 'role', value: 'manager' }), refs)).toEqual({
      left: { source: 'state', key: 'me', path: 'role' },
      operator: 'eq',
      right: { val: 'manager' },
    })
  })

  test('a load status test reads $status', () => {
    expect(dataConditionValue(cond({ test: 'failed' }), refs)).toEqual({
      left: { source: 'state', key: 'me', path: '$status' },
      operator: 'eq',
      right: { val: 'error' },
    })
  })

  test('the repeater item is the engine row context, values parsed', () => {
    expect(dataConditionValue(cond({ loadId: ITEM_CONDITION_SOURCE, path: 'featured', value: 'true' }), refs)).toEqual({
      left: { key: 'row', path: 'featured' },
      operator: 'eq',
      right: { val: true },
    })
    expect(dataConditionValue(cond({ loadId: ITEM_CONDITION_SOURCE, path: 'stock', op: 'lte', value: '5' }), refs)).toEqual({
      left: { key: 'row', path: 'stock' },
      operator: 'lte',
      right: { val: 5 },
    })
    expect(dataConditionValue(cond({ loadId: ITEM_CONDITION_SOURCE, path: 'note', op: 'set' }), refs)).toEqual({
      left: { key: 'row', path: 'note' },
      operator: 'neq',
      right: { val: undefined },
    })
  })

  test('a status test on the item exports nothing (always shown)', () => {
    expect(dataConditionValue(cond({ loadId: ITEM_CONDITION_SOURCE, test: 'loaded' }), refs)).toBeUndefined()
  })
})
