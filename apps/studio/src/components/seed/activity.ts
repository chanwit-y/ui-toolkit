import type { ActivityEntry } from '../Workspace/types'

/** The mockup's seven demo lines, newest first (relative to now). */
export function seedActivity(): ActivityEntry[] {
  const now = Date.now()
  const h = 3600000
  const rows: [string, string, ActivityEntry['kind'], string, string, number][] = [
    ['Nattapong V.', 'created', 'model', 'countryRes', 'initial shape for the country service', now - 96 * h],
    ['Pimchanok S.', 'created', 'api', 'searchCountries', 'GET /collection/search', now - 95 * h],
    ['Pimchanok S.', 'created', 'api', 'countriesPaged', 'POST /collection/page', now - 95 * h + 60000],
    ['Sarawut K.', 'created', 'project', 'Country manager', 'from the countries example', now - 72 * h],
    ['Sarawut K.', 'attached', 'api', 'searchCountries, countriesPaged', 'to Country manager', now - 71 * h],
    ['Thanapat R.', 'updated', 'model', 'countryPagedRes', 'added per_page', now - 30 * h],
    ['Sarawut K.', 'saved', 'project', 'Country manager', 'Countries · 2 element(s)', now - 2 * h],
  ]
  return rows
    .map(([user, verb, kind, name, detail, ts], i) => ({
      id: `seed-activity-${i}`,
      ts,
      user,
      verb,
      kind,
      name,
      detail,
      projectId: kind === 'project' || verb === 'attached' ? 'seed-project-country' : null,
    }))
    .reverse()
}
