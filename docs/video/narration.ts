/**
 * The intro's script (see docs/prompts/intro-video.md): seven scenes, each
 * narration line anchored to a mark the capture sets when the matching thing
 * happens on screen. A line starts at its mark, or right after the line before
 * it if that one is still speaking. To swap in a human voice, record one file
 * per line id as `voice/<id>.wav` (any length) and rebuild — no re-cut.
 */

export type Line = {
  id: string
  text: string
  /** The capture mark this line starts at; `start` = the scene's first frame. */
  at: string
}

export type Card = { title: string; subtitle: string; footer?: string }

export type Scene =
  | { id: string; kind: 'card'; card: Card; lines: Line[] }
  | { id: string; kind: 'capture' | 'split'; lines: Line[] }

export const SCENES: Scene[] = [
  {
    id: 's1-title',
    kind: 'card',
    card: { title: 'Gummy Studio', subtitle: 'Back-office apps, designed — not hand-coded', footer: 'Featuring the Gummy Books demo' },
    lines: [{ id: 'l1', at: 'start', text: 'Meet Gummy Books, a back office for a book shop.' }],
  },
  {
    id: 's2-demo',
    kind: 'capture',
    lines: [
      { id: 'l2a', at: 'start', text: 'It has a dashboard, server-paged tables with filters, detail pages, forms and sign-in.' },
      { id: 'l2b', at: 'bookPage', text: 'And not one of these screens was written by hand.' },
    ],
  },
  {
    id: 's3-studio',
    kind: 'capture',
    lines: [
      { id: 'l3a', at: 'start', text: 'Every page was designed in Gummy Studio.' },
      { id: 'l3b', at: 'tableSelected', text: 'Drop a component on the canvas, point it at an API endpoint, and set paging, sorting and filters in its properties.' },
      { id: 'l3c', at: 'preview', text: 'Then open the live preview, and try it with real data.' },
    ],
  },
  {
    id: 's4-settings',
    kind: 'capture',
    lines: [
      { id: 'l4a', at: 'start', text: 'Sign-in is a shared entry that each project picks.' },
      { id: 'l4b', at: 'condition', text: 'Roles are plain conditions, like: show this button only when the signed-in role is manager.' },
      { id: 'l4c', at: 'menu', text: 'Menus, colours and page transitions are settings too.' },
    ],
  },
  {
    id: 's5-roles',
    kind: 'capture',
    lines: [
      { id: 'l5a', at: 'start', text: "A clerk opens an order with a pending refund, and sees it's waiting for a manager." },
      { id: 'l5b', at: 'manager', text: 'The manager opens the same order, and can approve it.' },
      { id: 'l5c', at: 'approved', text: 'One page, one condition apart.' },
    ],
  },
  {
    id: 's6-live',
    kind: 'split',
    lines: [
      { id: 'l6a', at: 'start', text: 'The studio saves plain JSON next to your code.' },
      { id: 'l6b', at: 'typing', text: 'Change the app bar title, and the running app follows.' },
    ],
  },
  {
    id: 's7-end',
    kind: 'card',
    card: { title: 'Gummy Studio', subtitle: 'Design the screens. Keep your code for what matters.', footer: 'npx gummy studio' },
    lines: [{ id: 'l7', at: 'start', text: 'Gummy Studio. Design the screens, and keep your code for what matters.' }],
  },
]

export const VOICE = process.env.VOICE ?? 'Samantha'
/** Words per minute for `say` — a calm, clear pace. */
export const RATE = Number(process.env.RATE ?? 172)
