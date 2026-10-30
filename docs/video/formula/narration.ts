/**
 * The formula walkthrough's script (see ../README.md): every function,
 * operator and output format, then everywhere a formula runs, recorded on the
 * example app's Formula and Logic pages and the studio's seeded project. Same
 * conventions as the intro: every line starts at its capture mark;
 * `voice/<id>.wav` replaces a line.
 */
import type { Scene } from '../narration'

export const SCENES: Scene[] = [
  {
    id: 'f1-title',
    kind: 'card',
    card: { title: 'Every formula function', subtitle: 'ROUND  MIN  MAX  ABS  LEN  TODAY  DAYS  COUNT  SUM' },
    lines: [{ id: 'f1', at: 'start', text: 'Gummy formulas, in full. Nine functions, five operators, and every place a formula can run.' }],
  },
  {
    id: 'f2-arith',
    kind: 'capture',
    lines: [
      { id: 'f2a', at: 'start', text: 'Start with arithmetic: plus, minus, times and divide, with parentheses. Each value here is a formula, reading the form as you type.' },
      { id: 'f2b', at: 'round', text: 'ROUND sets the decimals, and a format writes the result in baht.' },
    ],
  },
  {
    id: 'f3-text',
    kind: 'capture',
    lines: [{ id: 'f3', at: 'start', text: 'The ampersand joins text, with fields and quoted words side by side. LEN counts the characters.' }],
  },
  {
    id: 'f4-functions',
    kind: 'capture',
    lines: [
      { id: 'f4a', at: 'start', text: 'MIN and MAX pick the smallest and the largest. ABS drops the sign.' },
      { id: 'f4b', at: 'dates', text: 'TODAY is the current date, and DAYS counts the days between two dates. Pick a start date, and the count follows.' },
    ],
  },
  {
    id: 'f5-lists',
    kind: 'capture',
    lines: [
      { id: 'f5a', at: 'start', text: 'COUNT and SUM read a list. Here, that list is page data: twelve months of sales.' },
      { id: 'f5b', at: 'sum', text: 'COUNT gives the number of months. SUM adds up any field you name. And they combine, so revenue over months is a monthly average.' },
    ],
  },
  {
    id: 'f6-blanks',
    kind: 'capture',
    lines: [
      { id: 'f6a', at: 'start', text: 'Leave an input blank, and the result stays blank, instead of a broken number.' },
      { id: 'f6b', at: 'policy', text: 'Each formula can choose otherwise. Count blanks as zero, or treat a divide by zero as an error, drawn as a dash.' },
    ],
  },
  {
    id: 'f7-where',
    kind: 'capture',
    lines: [
      { id: 'f7a', at: 'start', text: 'A formula can also fill a field. Subtotal is computed and locked, and it is sent with the form.' },
      { id: 'f7b', at: 'cond', text: 'A condition can compare a formula too. Under a subtotal of five thousand, the discount code stays locked.' },
      { id: 'f7c', at: 'saved', text: 'Raise the quantity. Formulas can be saved, reused by name, and can call a rule. Total takes the subtotal, the rule\'s discount rate, and VAT.' },
      { id: 'f7d', at: 'unlock', text: 'And past five thousand, the discount code unlocks.' },
      { id: 'f7e', at: 'table', text: 'In a table, a formula is a computed column. Density divides two fields of each row, and Member for counts days with DAYS and TODAY.' },
    ],
  },
  {
    id: 'f8-own',
    kind: 'capture',
    lines: [
      { id: 'f8a', at: 'start', text: 'So far, you wrote every formula. The formula element lets your users write their own, in the running app. They click a value, and an editor opens.' },
      { id: 'f8b', at: 'chips', text: 'They get the same editor as the studio. Search the Insert list, or type a word and let the bar complete it. Try it follows every keystroke, and a slip is caught right there.' },
      { id: 'f8c', at: 'showas', text: 'Show as picks the format: number, currency, percent or date. Done puts it on the page.' },
      { id: 'f8d', at: 'keep', text: 'It stays in their browser across a reload, kept per page and per element.' },
      { id: 'f8e', at: 'reset', text: 'And Reset goes back to where it started.' },
    ],
  },
  {
    id: 'f9-studio',
    kind: 'capture',
    lines: [
      { id: 'f9a', at: 'start', text: 'In Gummy Studio, the Formula tile drops a value on the canvas and opens the editor.' },
      { id: 'f9b', at: 'insert', text: 'The Insert list holds the form\'s fields, page data and saved formulas, then all nine functions, each with a short hint.' },
      { id: 'f9c', at: 'bar', text: 'Or just type a word. The bar completes it, writes the right syntax, and shows what each function needs next.' },
      { id: 'f9d', at: 'try', text: 'Decide what a blank or a divide by zero should do. Try it runs the real engine, and gives the reason for the error.' },
      { id: 'f9e', at: 'cell', text: 'Done, and the formula sits in its cell, ready to edit in place.' },
    ],
  },
  {
    id: 'f10-saved',
    kind: 'capture',
    lines: [
      { id: 'f10a', at: 'start', text: 'Save a formula once, and use it anywhere by name. Total is built from Subtotal, a rule and VAT, with Try it beside it.' },
      { id: 'f10b', at: 'usedby', text: 'Used by lists every place it runs, and JSON is what ships to the app.' },
    ],
  },
  {
    id: 'f11-end',
    kind: 'card',
    card: { title: 'Gummy UI', subtitle: 'One formula language, all as configuration.' },
    lines: [{ id: 'f11', at: 'start', text: 'Nine functions, five operators, one formula language, all as configuration.' }],
  },
]

export const VOICE = process.env.VOICE ?? 'Samantha'
export const RATE = Number(process.env.RATE ?? 172)
