import type { Cond, Expr } from '@gummy-ui/ui'
import {
  createChildCanvas,
  createDefaultButtonItemConfig,
  createDefaultDataTableConfig,
  createDefaultItemSettings,
  createDefaultRadioConfig,
  createDefaultSwitchConfig,
  createDefaultTextFieldConfig,
  createDefaultTypographyConfig,
  DEFAULT_COLUMN_SIZING,
  defaultColumnFormat,
  type ColumnFormatConfig,
  type DataTableColumnConfig,
  type GridItemData,
  type ItemBinding,
} from '../Layout/types'
import { inlineFormula, type FormulaLibDef, type RuleLibDef, type StudioFormula } from '../Workspace/logic'
import { COUNTRIES_ENDPOINT_ID } from './country'

/**
 * The seeded **Logic** page (the example app's `/logic`, see
 * `spec/gummy-logic-spec.md`) and the saved formulas / rules it uses — fixed
 * ids so the fresh seed and `migrateV60` agree, and re-runs are safe.
 */
export const LOGIC_PAGE_ID = 'seed-page-logic'
export const LOGIC_SUBTOTAL_ID = 'formula-seed-subtotal'
export const LOGIC_TOTAL_ID = 'formula-seed-total'
export const LOGIC_DENSITY_ID = 'formula-seed-density'
export const LOGIC_DISCOUNT_ID = 'rule-seed-discount'
export const LOGIC_BUSINESS_ID = 'rule-seed-business'
/** The v62 **Required when** items (inserted into an existing Logic page by `migrateV61`). */
export const LOGIC_REQUIRED_ITEM_IDS = ['seed-item-logic-require-h-title', 'seed-item-logic-require-h-caption', 'seed-item-logic-tax']

const field = (key: string): Expr => ({ ref: 'field', key })
const lit = (v: number | string | boolean): Expr => ({ lit: v })
const fmt = (patch: Partial<ColumnFormatConfig>): ColumnFormatConfig => ({ ...defaultColumnFormat(), ...patch })

export function logicSeedFormulas(): FormulaLibDef[] {
  const base = { description: '', format: defaultColumnFormat(), onEmpty: 'empty' as const, onDivideByZero: 'empty' as const }
  return [
    { ...base, id: LOGIC_SUBTOTAL_ID, name: 'Subtotal', description: 'Qty × Unit price', expr: { op: '*', args: [field('qty'), field('unitPrice')] } },
    {
      ...base,
      id: LOGIC_TOTAL_ID,
      name: 'Total',
      description: 'The subtotal less the tiered discount, plus 7 % VAT',
      expr: { op: '*', args: [{ op: '*', args: [{ formula: LOGIC_SUBTOTAL_ID }, { op: '-', args: [lit(1), { rule: LOGIC_DISCOUNT_ID }] }] }, lit(1.07)] },
      format: fmt({ type: 'currency', currency: 'THB', decimals: 2 }),
    },
    {
      ...base,
      id: LOGIC_DENSITY_ID,
      name: 'Density',
      description: 'Population per km² of a countries row',
      expr: { fn: 'ROUND', args: [{ op: '/', args: [{ ref: 'row', key: 'population' }, { ref: 'row', key: 'area_km2' }] }, lit(1)] },
      format: fmt({ type: 'number', decimals: 1 }),
    },
  ]
}

export function logicSeedRules(): RuleLibDef[] {
  const gte = (left: Expr, n: number): Cond => ({ cmp: 'gte', left, right: lit(n) })
  return [
    {
      id: LOGIC_DISCOUNT_ID,
      name: 'Discount rate',
      description: '10 % from a 10,000 subtotal, 5 % from 5,000',
      resultType: 'number',
      format: fmt({ type: 'percent', decimals: 0 }),
      rule: {
        branches: [
          { when: gte({ formula: LOGIC_SUBTOTAL_ID }, 10000), then: lit(0.1) },
          { when: gte({ formula: LOGIC_SUBTOTAL_ID }, 5000), then: lit(0.05) },
        ],
        else: lit(0),
      },
    },
    {
      id: LOGIC_BUSINESS_ID,
      name: 'Is business',
      description: 'The customer picked Business',
      resultType: 'boolean',
      format: defaultColumnFormat(),
      rule: { branches: [{ when: { cmp: 'eq', left: field('customerType'), right: lit('Business') }, then: lit(true) }], else: lit(false) },
    },
  ]
}

export function logicDemoSeedItems(): GridItemData[] {
  const full = { xs: 4, sm: 6, md: 8, lg: 12 }
  const third = { xs: 4, sm: 6, md: 4, lg: 4 }
  const half = { xs: 4, sm: 6, md: 4, lg: 6 }
  const typography = (id: string, text: string, extra: Record<string, unknown> = {}, colSpan = full): GridItemData => ({
    id,
    label: 'Typography',
    type: 'typography',
    settings: createDefaultItemSettings({ colSpan }),
    config: { ...createDefaultTypographyConfig(), text, variant: 'body2', ...extra },
  })
  const heading = (id: string, text: string, caption: string) => [
    typography(`${id}-title`, text, { variant: 'subtitle1', weight: 'medium' }),
    typography(`${id}-caption`, caption, { color: 'gray' }),
  ]
  const formulaBinding = (formula: StudioFormula): ItemBinding => ({ key: '', path: '', source: 'formula', formula })
  const textField = (id: string, name: string, label: string, extra: Record<string, unknown> = {}, colSpan = third, item: Partial<GridItemData> = {}): GridItemData => ({
    id,
    label: 'Text Field',
    type: 'textfield',
    settings: createDefaultItemSettings({ colSpan }),
    // The canvas previews a set error message, so only a required field has one.
    config: { ...createDefaultTextFieldConfig(name), label, ...(extra.isRequired ? { errorMessage: `${label} is required` } : {}), ...extra },
    ...item,
  })
  const column = (accessor: string, header: string, extra: Partial<DataTableColumnConfig> = {}): DataTableColumnConfig => ({
    id: `seed-col-logic-${accessor}`,
    accessor,
    header,
    enableSorting: true,
    enableColumnFilter: false,
    align: 'center',
    format: defaultColumnFormat(),
    pin: '',
    html: '',
    sortField: '',
    lines: '',
    rowHeader: false,
    mergeRows: false,
    mergeColumns: false,
    group: '',
    ...DEFAULT_COLUMN_SIZING,
    ...extra,
  })
  const total = inlineFormula({ fn: 'ROUND', args: [{ formula: LOGIC_TOTAL_ID }, lit(2)] })
  const memberDays = inlineFormula({ fn: 'DAYS', args: [{ ref: 'row', key: 'joined_at' }, { fn: 'TODAY', args: [] }] })
  return [
    typography('seed-item-logic-h', 'Logic', { variant: 'h3' }),
    typography(
      'seed-item-logic-intro',
      'Formulas compute a value, rules pick one (IF / ELSE IF / ELSE), conditions show, hide, enable or style — all in the config, reading the form as you type. The saved formulas and rules are on the Logic tab; select an item and look at its Show when / Enabled when / Value. Preview to try it.',
      { color: 'gray' },
    ),
    ...heading('seed-item-logic-order-h', 'Order line', 'Subtotal and Total (raw) are computed fields: locked, recalculated as you type, submitted with the form. Below: the discount rate (a rule shown with its percent format) and the formatted total.'),
    textField('seed-item-logic-qty', 'qty', 'Qty', { dataType: 'number', isRequired: true }),
    textField('seed-item-logic-price', 'unitPrice', 'Unit price', { dataType: 'number', isRequired: true }),
    textField('seed-item-logic-subtotal', 'subtotal', 'Subtotal', { dataType: 'number' }, third, {
      valueFormula: { formulaId: LOGIC_SUBTOTAL_ID },
      valueMode: 'computed',
    }),
    typography('seed-item-logic-discount', '', { variant: 'h5', binding: formulaBinding({ formulaId: LOGIC_DISCOUNT_ID }) }, third),
    typography('seed-item-logic-total-text', '', { variant: 'h5', weight: 'bold', binding: formulaBinding({ formulaId: LOGIC_TOTAL_ID }) }, third),
    textField('seed-item-logic-total', 'total', 'Total (raw, submitted)', { dataType: 'number' }, third, { valueFormula: total, valueMode: 'computed' }),
    ...heading('seed-item-logic-show-h', 'Show when', 'Company name shows only for a Business customer — its Show when is the saved rule Is business. Hidden, it is neither validated nor sent.'),
    {
      id: 'seed-item-logic-type',
      label: 'Radio',
      type: 'radio',
      settings: createDefaultItemSettings({ colSpan: half }),
      config: {
        ...createDefaultRadioConfig('customerType'),
        label: 'Customer',
        isRequired: true,
        orientation: 'horizontal',
        defaultValue: 'Personal',
        options: [
          { value: 'Personal', label: 'Personal', disabled: false },
          { value: 'Business', label: 'Business', disabled: false },
        ],
      },
    },
    textField('seed-item-logic-company', 'company', 'Company name', { isRequired: true }, half, { condition: { rule: LOGIC_BUSINESS_ID } }),
    ...heading('seed-item-logic-require-h', 'Required when', 'Tax ID is required only for a Business customer: for Personal it may be left blank.'),
    textField('seed-item-logic-tax', 'taxId', 'Tax ID', { isRequired: true, errorMessage: 'A business needs a tax ID' }, half, { requiredWhen: { rule: LOGIC_BUSINESS_ID } }),
    ...heading('seed-item-logic-enable-h', 'Enabled when', 'Discount code unlocks once the subtotal reaches 5,000. Save is clickable only while Accept the terms is on; a disabled field is not validated but is still sent.'),
    textField('seed-item-logic-code', 'discountCode', 'Discount code', { helperText: 'Needs a subtotal of 5,000' }, half, {
      enabledWhen: { cmp: 'gte', left: { formula: LOGIC_SUBTOTAL_ID }, right: lit(5000) },
    }),
    {
      id: 'seed-item-logic-accept',
      label: 'Switch',
      type: 'switch',
      settings: createDefaultItemSettings({ colSpan: half }),
      config: { ...createDefaultSwitchConfig('accept'), label: 'Accept the terms' },
    },
    {
      id: 'seed-item-logic-save',
      label: 'Button',
      type: 'button',
      settings: createDefaultItemSettings({ colSpan: half, justifySelf: { xs: 'start', sm: 'start', md: 'start', lg: 'start' } }),
      config: {
        ...createDefaultButtonItemConfig(),
        label: 'Save order',
        icon: 'save',
        // No endpoint: Save validates the form (hidden fields skipped) and reports.
        actions: ['SubmitFormToPostAPI'],
        snackbarSuccessEnabled: true,
        snackbarSuccessMessage: 'Valid — hidden fields were skipped',
      },
      enabledWhen: { cmp: 'eq', left: field('accept'), right: lit(true) },
    },
    ...heading('seed-item-logic-table-h', 'Table', 'Density is a computed column (the saved formula Density over row refs); Member for counts days since joined_at with DAYS(…, TODAY()). Rows are tinted green when growth > 2 % and density > 100, or the country is landlocked.'),
    {
      id: 'seed-item-logic-table',
      label: 'Data Table',
      type: 'datatable',
      settings: createDefaultItemSettings({ colSpan: full }),
      config: {
        ...createDefaultDataTableConfig('dtLogicCountries'),
        title: 'Countries',
        canEdit: false,
        canDelete: false,
        apiPaths: 'data',
        endpointId: COUNTRIES_ENDPOINT_ID,
        columns: [
          column('name', 'Country', { align: 'start' }),
          column('population', 'Population', { format: fmt({ type: 'number' }) }),
          column('area_km2', 'Area (km²)', { format: fmt({ type: 'number' }) }),
          column('density', 'Density', { value: { formulaId: LOGIC_DENSITY_ID }, format: fmt({ type: 'number', decimals: 1 }) }),
          column('growth', 'Growth', { format: fmt({ type: 'percent', decimals: 1 }) }),
          column('memberDays', 'Member for (days)', { value: memberDays, format: fmt({ type: 'number' }) }),
          column('landlocked', 'Landlocked', { format: fmt({ type: 'boolean', trueLabel: 'Yes', falseLabel: 'No' }) }),
        ],
        rowStyles: [
          {
            id: 'seed-rule-logic-green',
            field: 'row',
            path: '',
            op: 'eq',
            value: '',
            tone: 'grass',
            fill: true,
            bold: false,
            italic: false,
            strike: false,
            condition: {
              any: [
                {
                  all: [
                    { cmp: 'gt', left: { ref: 'row', key: 'growth' }, right: lit(0.02) },
                    { cmp: 'gt', left: { formula: LOGIC_DENSITY_ID }, right: lit(100) },
                  ],
                },
                { cmp: 'eq', left: { ref: 'row', key: 'landlocked' }, right: lit(true) },
              ],
            },
          },
        ],
      },
      childCanvases: [createChildCanvas(), createChildCanvas()],
    },
  ]
}
