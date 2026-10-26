import approvalline from './guides/approvalline.md' with { type: 'text' }
import button from './guides/button.md' with { type: 'text' }
import card from './guides/card.md' with { type: 'text' }
import checkbox from './guides/checkbox.md' with { type: 'text' }
import conceptsCustomCode from './guides/concepts/custom-code.md' with { type: 'text' }
import conceptsNavigation from './guides/concepts/navigation.md' with { type: 'text' }
import conceptsPageData from './guides/concepts/page-data.md' with { type: 'text' }
import conceptsShellTheme from './guides/concepts/shell-theme.md' with { type: 'text' }
import conceptsSignIn from './guides/concepts/sign-in.md' with { type: 'text' }
import container from './guides/container.md' with { type: 'text' }
import custom from './guides/custom.md' with { type: 'text' }
import datatable from './guides/datatable.md' with { type: 'text' }
import datatableeditable from './guides/datatableeditable.md' with { type: 'text' }
import date from './guides/date.md' with { type: 'text' }
import display from './guides/display.md' with { type: 'text' }
import formlist from './guides/formlist.md' with { type: 'text' }
import html from './guides/html.md' with { type: 'text' }
import modal from './guides/modal.md' with { type: 'text' }
import profile from './guides/profile.md' with { type: 'text' }
import radio from './guides/radio.md' with { type: 'text' }
import recipesCrudPage from './guides/recipes/crud-page.md' with { type: 'text' }
import recipesDetailPage from './guides/recipes/detail-page.md' with { type: 'text' }
import recipesMasterDetail from './guides/recipes/master-detail.md' with { type: 'text' }
import repeater from './guides/repeater.md' with { type: 'text' }
import select from './guides/select.md' with { type: 'text' }
import start from './guides/start.md' with { type: 'text' }
import switchGuide from './guides/switch.md' with { type: 'text' }
import tab from './guides/tab.md' with { type: 'text' }
import textarea from './guides/textarea.md' with { type: 'text' }
import textfield from './guides/textfield.md' with { type: 'text' }
import upload from './guides/upload.md' with { type: 'text' }
import workfloweditor from './guides/workfloweditor.md' with { type: 'text' }

/*
 * The authoring guides the MCP serves as resources (`gummy://guide/<topic>`,
 * see the grilled design `mcp-server`): `start`, one per item type (several
 * types share one — `ITEM_TYPES[type].guide`), the concepts and the recipes.
 * Written for Claude, about the studio config — not the engine internals.
 */
export const GUIDES: Record<string, string> = {
  approvalline,
  button,
  card,
  checkbox,
  'concepts/custom-code': conceptsCustomCode,
  'concepts/navigation': conceptsNavigation,
  'concepts/page-data': conceptsPageData,
  'concepts/shell-theme': conceptsShellTheme,
  'concepts/sign-in': conceptsSignIn,
  container,
  custom,
  datatable,
  datatableeditable,
  date,
  display,
  formlist,
  html,
  modal,
  profile,
  radio,
  'recipes/crud-page': recipesCrudPage,
  'recipes/detail-page': recipesDetailPage,
  'recipes/master-detail': recipesMasterDetail,
  repeater,
  select,
  start,
  switch: switchGuide,
  tab,
  textarea,
  textfield,
  upload,
  workfloweditor,
}

/**
 * Guide topics `ITEM_TYPES` names that are not written yet. The drift test
 * requires every named topic to exist or be listed here, and everything listed
 * here to still be missing — so the list can only shrink. Empty since phase 2:
 * a new item type ships with its guide.
 */
export const PENDING_GUIDES = new Set<string>()

export function guide(topic: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(GUIDES, topic) ? GUIDES[topic] : undefined
}
