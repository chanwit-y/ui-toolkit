/**
 * The charts preview's script (see README.md): the `chart` element's ten
 * types, recorded on the demo's **Charts showcase** project and its studio.
 * Same conventions as the intro: every line starts at its capture mark;
 * `voice/<id>.wav` replaces a line.
 */
import type { Scene } from '../narration'

export const SCENES: Scene[] = [
  {
    id: 'c1-title',
    kind: 'card',
    card: { title: 'Charts', subtitle: 'Ten chart types, as configuration', footer: 'Gummy UI · on the Gummy Books demo data' },
    lines: [{ id: 'c1', at: 'start', text: 'Gummy now draws charts. Ten types, from bars to gauges, and every one of them is configuration.' }],
  },
  {
    id: 'c2-sales',
    kind: 'capture',
    lines: [
      { id: 'c2a', at: 'start', text: 'A chart reads its rows from an endpoint. The dashed target comes from the same response, read by path.' },
      { id: 'c2b', at: 'click', text: 'Click a bar, and that week becomes page data. The block beside it reads it back.' },
      { id: 'c2c', at: 'more', text: "Lines and stacked areas take the same rows, in the app's own date and number formats." },
    ],
  },
  {
    id: 'c3-mix',
    kind: 'capture',
    lines: [
      { id: 'c3a', at: 'start', text: 'Parts of a whole: a donut with its total, ranked bars, and the order funnel. The legend toggles any slice.' },
      { id: 'c3b', at: 'navigate', text: "And a click can navigate. This slice opens its genre's books, the clicked row filling the page's URL." },
    ],
  },
  {
    id: 'c4-compare',
    kind: 'capture',
    lines: [
      { id: 'c4a', at: 'start', text: 'Bars and a line share one chart, with the orders on a right-hand axis.' },
      { id: 'c4b', at: 'bubble', text: 'Every book as a bubble: price against rating, sized by its pages, one series per genre.' },
    ],
  },
  {
    id: 'c5-patterns',
    kind: 'capture',
    lines: [
      { id: 'c5a', at: 'start', text: "A heatmap shows when the orders come in, on the theme's accent ramp." },
      { id: 'c5b', at: 'radar', text: 'Radars compare the genres on five scores, as a polygon or a circle.' },
    ],
  },
  {
    id: 'c6-kpis',
    kind: 'capture',
    lines: [
      { id: 'c6a', at: 'start', text: 'Gauges hold each KPI against its target, with colour bands, radial or linear.' },
      { id: 'c6b', at: 'dark', text: 'And every chart follows the theme, into dark mode and back, on a palette checked for contrast.' },
    ],
  },
  {
    id: 'c7-studio',
    kind: 'capture',
    lines: [
      { id: 'c7a', at: 'start', text: 'In Gummy Studio, a chart is one item. Pick a type, and the canvas redraws it over sample data.' },
      { id: 'c7b', at: 'sections', text: 'Series, axes, reference lines, the legend and clicks are all settings, with nothing to code.' },
    ],
  },
  {
    id: 'c8-end',
    kind: 'card',
    card: { title: 'Gummy UI', subtitle: 'Configure the chart. Keep your code for the business.', footer: 'npx gummy studio' },
    lines: [{ id: 'c8', at: 'start', text: 'Gummy UI. Configure the chart, and keep your code for the business.' }],
  },
]

export const VOICE = process.env.VOICE ?? 'Samantha'
export const RATE = Number(process.env.RATE ?? 172)
