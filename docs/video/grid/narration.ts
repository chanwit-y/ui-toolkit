/**
 * The data grid preview's script (see README.md): the AG Grid-style features
 * of Gummy's data table, one scene each, recorded on the demo's **Data grid
 * showcase** project and its studio. Same conventions as the intro: every
 * line starts at its capture mark; `voice/<id>.wav` replaces a line.
 */
import type { Scene } from '../narration'

export const SCENES: Scene[] = [
  {
    id: 'g1-title',
    kind: 'card',
    card: { title: 'Data grid', subtitle: 'The AG Grid features, as configuration', footer: 'Gummy UI · on the Gummy Books demo data' },
    lines: [{ id: 'g1', at: 'start', text: "Gummy's data table now does what teams reach for AG Grid to do, and all of it is configuration." }],
  },
  {
    id: 'g2-formats',
    kind: 'capture',
    lines: [
      { id: 'g2a', at: 'start', text: "Prices, stock and dates arrive as raw numbers. Each column's format shows them in the app's locale." },
      { id: 'g2b', at: 'rules', text: 'Style rules tint cells by a condition: out of stock in red, low stock in amber, top ratings in green.' },
    ],
  },
  {
    id: 'g3-columns',
    kind: 'capture',
    lines: [
      { id: 'g3a', at: 'start', text: 'The Columns menu shows or hides a column, and you drag one into a new place.' },
      { id: 'g3b', at: 'reload', text: 'The layout is remembered, so a reload keeps it, and Reset puts the configured one back.' },
    ],
  },
  {
    id: 'g4-selection',
    kind: 'capture',
    lines: [
      { id: 'g4a', at: 'start', text: 'Tick rows, or every matching row at once.' },
      { id: 'g4b', at: 'bound', text: 'The picks become page data, so any component can read them, like this summary line.' },
    ],
  },
  {
    id: 'g5-grouping',
    kind: 'capture',
    lines: [
      { id: 'g5a', at: 'start', text: 'Group three hundred orders by status, then city, with counts, sums and a total row.' },
      { id: 'g5b', at: 'regroup', text: 'And regroup them from the same menu, without touching the config.' },
    ],
  },
  {
    id: 'g6-export',
    kind: 'capture',
    lines: [
      { id: 'g6a', at: 'start', text: 'Export writes the table as you see it: searched, sorted and formatted.' },
      { id: 'g6b', at: 'csv', text: 'Into a CSV file that opens straight in Excel.' },
    ],
  },
  {
    id: 'g7-scroll',
    kind: 'capture',
    lines: [
      { id: 'g7a', at: 'start', text: 'Scroll mode puts every row in one scroller. Past sixty rows, only the rows in view are drawn.' },
      { id: 'g7b', at: 'bottom', text: 'So three hundred orders scroll as smoothly as ten.' },
    ],
  },
  {
    id: 'g8-studio',
    kind: 'capture',
    lines: [
      { id: 'g8a', at: 'start', text: 'Every one of these is a setting on the table, in Gummy Studio.' },
      { id: 'g8b', at: 'sections', text: 'Columns, selection, style rules, grouping, export and paging, with nothing to code.' },
    ],
  },
  {
    id: 'g9-end',
    kind: 'card',
    card: { title: 'Gummy UI', subtitle: 'Configure the grid. Keep your code for the business.', footer: 'npx gummy studio' },
    lines: [{ id: 'g9', at: 'start', text: 'Gummy UI. Configure the grid, and keep your code for the business.' }],
  },
]

export const VOICE = process.env.VOICE ?? 'Samantha'
export const RATE = Number(process.env.RATE ?? 172)
