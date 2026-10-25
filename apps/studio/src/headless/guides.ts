import button from './guides/button.md' with { type: 'text' }
import card from './guides/card.md' with { type: 'text' }
import container from './guides/container.md' with { type: 'text' }
import datatable from './guides/datatable.md' with { type: 'text' }
import modal from './guides/modal.md' with { type: 'text' }
import crudPage from './guides/recipes/crud-page.md' with { type: 'text' }
import repeater from './guides/repeater.md' with { type: 'text' }
import select from './guides/select.md' with { type: 'text' }
import start from './guides/start.md' with { type: 'text' }
import tab from './guides/tab.md' with { type: 'text' }
import textfield from './guides/textfield.md' with { type: 'text' }

/*
 * The authoring guides the MCP serves as resources (`gummy://guide/<topic>`,
 * see the grilled design `mcp-server`): `start`, one per item type (several
 * types share one — `ITEM_TYPES[type].guide`) and the recipes. Written for
 * Claude, about the studio config — not the engine internals.
 */
export const GUIDES: Record<string, string> = {
  start,
  textfield,
  select,
  button,
  datatable,
  container,
  modal,
  tab,
  repeater,
  card,
  'recipes/crud-page': crudPage,
}

/**
 * Guide topics `ITEM_TYPES` names that are not written yet (phase 2 of the
 * design). The drift test requires every named topic to exist or be listed
 * here, and everything listed here to still be missing — so the list can only
 * shrink. `describe_item_type` falls back to the schema's descriptions.
 */
export const PENDING_GUIDES = new Set([
  'textarea',
  'checkbox',
  'switch',
  'radio',
  'date',
  'upload',
  'workfloweditor',
  'datatableeditable',
  'formlist',
  'display',
  'html',
  'custom',
  'approvalline',
  'profile',
])

export function guide(topic: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(GUIDES, topic) ? GUIDES[topic] : undefined
}
