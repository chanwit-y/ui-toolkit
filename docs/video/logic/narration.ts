/**
 * The logic preview's script (see ../README.md): formulas, rules and
 * conditions, recorded on the example app's Logic page, the studio's seeded
 * Logic page and the Book shop's order page. Same conventions as the intro:
 * every line starts at its capture mark; `voice/<id>.wav` replaces a line.
 */
import type { Scene } from '../narration'

export const SCENES: Scene[] = [
  {
    id: 'l1-title',
    kind: 'card',
    card: { title: 'Formulas and rules', subtitle: 'Calculations and conditions, as configuration', footer: 'Gummy UI' },
    lines: [{ id: 'l1', at: 'start', text: 'Gummy can now calculate. Formulas compute a value, rules pick one, and conditions show, hide or enable anything, all as configuration.' }],
  },
  {
    id: 'l2-app',
    kind: 'capture',
    lines: [
      { id: 'l2a', at: 'start', text: 'This form is config alone. Type a quantity and a price, and the subtotal, the discount and the total follow as you go.' },
      { id: 'l2b', at: 'tier', text: 'Cross ten thousand, and a rule moves the discount to its next tier.' },
      { id: 'l2c', at: 'business', text: 'Pick Business. The company field appears, and the tax ID becomes required. A hidden field is neither validated nor sent.' },
    ],
  },
  {
    id: 'l3-slot',
    kind: 'capture',
    lines: [
      { id: 'l3a', at: 'start', text: 'In Gummy Studio, every item has a logic panel, and a condition is built by picking, not by typing syntax.' },
      { id: 'l3b', at: 'typed', text: 'The operators and the value follow the field: its options here, a number box for a number.' },
      { id: 'l3c', at: 'saved', text: 'Saved rules sit in the same list, so a condition used twice is written once.' },
    ],
  },
  {
    id: 'l4-formula',
    kind: 'capture',
    lines: [
      { id: 'l4a', at: 'start', text: 'Formulas get one smart bar. Start from a template, or just type a word.' },
      { id: 'l4b', at: 'typing', text: 'It suggests fields, functions and saved formulas, writes the right syntax, and shows what each function needs next.' },
      { id: 'l4c', at: 'showas', text: 'Choose how the result is shown, and Try it runs the real engine on sample values, already filled in.' },
    ],
  },
  {
    id: 'l5-rule',
    kind: 'capture',
    lines: [
      { id: 'l5a', at: 'start', text: 'A rule is a stack of cards: if, else if, otherwise. Checked from the top, the first match wins.' },
      { id: 'l5b', at: 'try', text: 'Change a sample, and the matching card moves with it, with a tick or a cross on every line.' },
    ],
  },
  {
    id: 'l6-rename',
    kind: 'capture',
    lines: [
      { id: 'l6a', at: 'start', text: 'The Logic tab shows where each saved item is used, one click from the item itself.' },
      { id: 'l6b', at: 'rename', text: 'Rename a field, and the studio offers to bring its logic along.' },
    ],
  },
  {
    id: 'l7-book',
    kind: 'capture',
    lines: [
      { id: 'l7a', at: 'start', text: 'And it all runs from JSON in the real app. The Book shop reads the next step on an order from a rule, and its age from a formula.' },
      { id: 'l7b', at: 'next', text: 'Another order, another answer, with no code behind it.' },
    ],
  },
  {
    id: 'l8-end',
    kind: 'card',
    card: { title: 'Gummy UI', subtitle: 'Configure the logic. Keep your code for the business.', footer: 'npx gummy studio' },
    lines: [{ id: 'l8', at: 'start', text: 'Gummy UI. Configure the logic, and keep your code for the business.' }],
  },
]

export const VOICE = process.env.VOICE ?? 'Samantha'
export const RATE = Number(process.env.RATE ?? 172)
