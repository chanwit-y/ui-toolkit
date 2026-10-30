import type { Expr, ExprFunction } from '@gummy-ui/ui'
import {
  createDefaultDateConfig,
  createDefaultFormulaWidgetConfig,
  createDefaultItemSettings,
  createDefaultTextFieldConfig,
  createDefaultTypographyConfig,
  defaultColumnFormat,
  type ColumnFormatConfig,
  type GridItemData,
  type ItemBinding,
  type TypographyConfig,
} from '../Layout/types'
import { inlineFormula, type StudioFormula } from '../Workspace/logic'

/**
 * The seeded **Formula** page: what the palette's Formula tile produces — a
 * typography bound to an inline formula over the page's form — one per
 * operator, function and output format (see `spec/gummy-logic-spec.md`).
 * Fixed ids so the fresh seed and `migrateV62` agree, and re-runs are safe.
 */
export const FORMULA_PAGE_ID = 'seed-page-formula'
/** The v64 **Your own formula** items (the end user's `formula` element), appended to an existing Formula page by `migrateV63`. */
export const FORMULA_WIDGET_ITEM_IDS = ['seed-item-formula-own-h-title', 'seed-item-formula-own-h-caption', 'seed-item-formula-own-total', 'seed-item-formula-own-scratch']

const field = (key: string): Expr => ({ ref: 'field', key })
const lit = (v: number | string | boolean): Expr => ({ lit: v })
const op = (o: '+' | '-' | '*' | '/' | '&', a: Expr, b: Expr): Expr => ({ op: o, args: [a, b] })
const fn = (name: ExprFunction, ...args: Expr[]): Expr => ({ fn: name, args })
const fmt = (patch: Partial<ColumnFormatConfig>): ColumnFormatConfig => ({ ...defaultColumnFormat(), ...patch })
const thb = fmt({ type: 'currency', currency: 'THB', decimals: 2 })
const integer = fmt({ type: 'number', decimals: 0 })

type Metric = { id: string; caption: string; formula: StudioFormula; weight?: TypographyConfig['weight'] }

export function formulaDemoSeedItems(): GridItemData[] {
  const full = { xs: 4, sm: 6, md: 8, lg: 12 }
  const third = { xs: 4, sm: 6, md: 4, lg: 4 }
  const quarter = { xs: 4, sm: 3, md: 4, lg: 3 }
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
  const textField = (id: string, name: string, label: string, extra: Record<string, unknown> = {}, colSpan = third): GridItemData => ({
    id,
    label: 'Text Field',
    type: 'textfield',
    settings: createDefaultItemSettings({ colSpan }),
    config: { ...createDefaultTextFieldConfig(name), label, ...extra },
  })
  const number = (id: string, name: string, label: string, extra: Record<string, unknown> = {}, colSpan = third) =>
    textField(id, name, label, { dataType: 'number', ...extra }, colSpan)
  // Exactly what the Formula tile drops: a typography with a blank fallback
  // bound to an inline formula (`createItem` with `preset: 'formula'`).
  const formulaBinding = (formula: StudioFormula): ItemBinding => ({ key: '', path: '', source: 'formula', formula })
  const formulaItem = (id: string, formula: StudioFormula, colSpan: typeof full, weight: TypographyConfig['weight'] = ''): GridItemData => ({
    id,
    label: 'Formula',
    type: 'typography',
    settings: createDefaultItemSettings({ colSpan }),
    config: { ...createDefaultTypographyConfig(), text: '', variant: 'h5', weight, binding: formulaBinding(formula) },
  })
  // A row of captions over a row of results, so each result sits under its caption.
  const metrics = (list: Metric[], colSpan: typeof full) => [
    ...list.map((m) => typography(`${m.id}-caption`, m.caption, { color: 'gray' }, colSpan)),
    ...list.map((m) => formulaItem(m.id, m.formula, colSpan, m.weight ?? '')),
  ]
  const formula = (expr: Expr, format = defaultColumnFormat(), extra: Partial<Exclude<StudioFormula, { formulaId: string }>> = {}): StudioFormula => ({
    ...(inlineFormula(expr) as Exclude<StudioFormula, { formulaId: string }>),
    format,
    ...extra,
  })

  const subtotal = op('*', field('quantity'), field('price'))
  const discount = op('/', op('*', subtotal, field('discountPct')), lit(100))
  const total = fn('ROUND', op('-', subtotal, discount), lit(2))

  return [
    typography('seed-item-formula-h', 'Formula', { variant: 'h3' }),
    typography(
      'seed-item-formula-intro',
      'Every value on this page is a Formula tile from the Display group: a typography bound to an inline formula that reads the form as you type and shows through its output format. Drop the tile and the editor opens; select a value here and open its Formula chip to see how it is written. Preview to try it.',
      { color: 'gray' },
    ),
    ...heading('seed-item-formula-math-h', 'Arithmetic', '+ − × ÷ with parentheses, ROUND, and a currency format. Blank inputs give a blank result, and so does dividing by zero (Per unit with no quantity).'),
    number('seed-item-formula-qty', 'quantity', 'Quantity'),
    number('seed-item-formula-price', 'price', 'Unit price'),
    number('seed-item-formula-discount', 'discountPct', 'Discount %', { helperText: '0 – 100' }),
    ...metrics(
      [
        { id: 'seed-item-formula-subtotal', caption: 'Subtotal = Quantity × Unit price', formula: formula(subtotal, thb) },
        { id: 'seed-item-formula-discount-amt', caption: 'Discount = Subtotal × Discount % ÷ 100', formula: formula(discount, thb) },
        { id: 'seed-item-formula-total', caption: 'Total = ROUND(Subtotal − Discount, 2)', formula: formula(total, thb), weight: 'bold' },
        { id: 'seed-item-formula-per-unit', caption: 'Per unit = Total ÷ Quantity', formula: formula(op('/', total, field('quantity')), thb) },
      ],
      quarter,
    ),
    ...heading('seed-item-formula-text-h', 'Text', '& joins text; LEN counts characters. A number format on text is ignored, so these keep the default format.'),
    textField('seed-item-formula-first', 'firstName', 'First name', {}, half),
    textField('seed-item-formula-last', 'lastName', 'Last name', {}, half),
    ...metrics(
      [
        { id: 'seed-item-formula-full-name', caption: 'First name & " " & Last name', formula: formula(op('&', op('&', field('firstName'), lit(' ')), field('lastName'))) },
        { id: 'seed-item-formula-greeting', caption: '"Hello, " & First name & "!"', formula: formula(op('&', op('&', lit('Hello, '), field('firstName')), lit('!'))) },
        { id: 'seed-item-formula-len', caption: 'LEN(First name) + LEN(Last name)', formula: formula(op('+', fn('LEN', field('firstName')), fn('LEN', field('lastName'))), integer) },
      ],
      third,
    ),
    ...heading('seed-item-formula-fn-h', 'Functions', 'MIN, MAX and ABS over two numbers; DAYS between a date field and TODAY(); TODAY() alone with a date format.'),
    number('seed-item-formula-low', 'low', 'Low'),
    number('seed-item-formula-high', 'high', 'High'),
    {
      id: 'seed-item-formula-start',
      label: 'Date Picker',
      type: 'datepicker',
      settings: createDefaultItemSettings({ colSpan: third }),
      config: { ...createDefaultDateConfig('date', 'startDate'), label: 'Start date' },
    },
    ...metrics(
      [
        { id: 'seed-item-formula-min', caption: 'MIN(Low, High)', formula: formula(fn('MIN', field('low'), field('high'))) },
        { id: 'seed-item-formula-max', caption: 'MAX(Low, High)', formula: formula(fn('MAX', field('low'), field('high'))) },
        { id: 'seed-item-formula-abs', caption: 'ABS(Low − High)', formula: formula(fn('ABS', op('-', field('low'), field('high')))) },
        { id: 'seed-item-formula-days', caption: 'DAYS(Start date, TODAY())', formula: formula(fn('DAYS', field('startDate'), fn('TODAY')), integer) },
        { id: 'seed-item-formula-today', caption: 'TODAY()', formula: formula(fn('TODAY'), fmt({ type: 'date', pattern: 'DD MMM YYYY' })) },
      ],
      quarter,
    ),
    ...heading('seed-item-formula-blank-h', 'Blanks and errors', 'The same arithmetic with the other policies: blanks counted as 0, and an error (a dash with the reason as a tooltip) on dividing by zero.'),
    ...metrics(
      [
        { id: 'seed-item-formula-blank-zero', caption: 'Quantity × Unit price, blanks as 0', formula: formula(subtotal, thb, { onEmpty: 'zero' }) },
        { id: 'seed-item-formula-div-error', caption: 'Unit price ÷ Discount %, error on ÷ 0', formula: formula(op('/', field('price'), field('discountPct')), fmt({ type: 'number', decimals: 2 }), { onDivideByZero: 'error' }) },
      ],
      half,
    ),
    ...heading(
      'seed-item-formula-own-h',
      'Your own formula',
      'The Logic group’s New formula tile — the end user’s formula: in the running app a click opens a modal to write one over this page’s fields; the result shows here through its format. Kept in the browser per page and element; Reset returns to the starting formula. The second starts empty and lives for the tab.',
    ),
    {
      id: 'seed-item-formula-own-total',
      label: 'New formula',
      type: 'formula',
      settings: createDefaultItemSettings({ colSpan: half }),
      config: { ...createDefaultFormulaWidgetConfig('myTotal'), label: 'Total with 7 % VAT', formula: formula(op('*', total, lit(1.07)), thb) },
    },
    {
      id: 'seed-item-formula-own-scratch',
      label: 'New formula',
      type: 'formula',
      settings: createDefaultItemSettings({ colSpan: half }),
      config: { ...createDefaultFormulaWidgetConfig('scratch'), label: 'Scratch', placeholder: 'Click to write a formula', persist: 'session', variant: 'h4' },
    },
  ]
}
