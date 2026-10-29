import { createDefaultChartAxis, createDefaultChartSeries, defaultColumnFormat, type ChartConfig, type ChartSeriesConfig, type ColumnFormatConfig } from '../../Layout/types'
import { createDefaultBackdrop, type StudioThemeConfig } from '../../Theme/types'
import { defaultShell } from '../../Workspace/snapshots'
import { projectKey } from '../../Workspace/runtimeProject'
import type { MenuItemDef, PageDef, ProjectDef, ShellSettings } from '../../Workspace/types'
import type { EnvVarDef } from '../../Env/types'
import { E } from '../bookshop/library'
import { page } from '../bookshop/pages'
import { chart, column, COVER_CELL, FULL, HALF, heading, html, navigate, navButton, rowParam, settings, state, table, THIRD, typo, urlParam } from '../bookshop/ui'

/**
 * Charts showcase — the demo's fifth project (see `spec/gummy-chart-spec.md`):
 * the config-driven `chart`'s ten types over the Book shop API's analytics
 * aggregates (`/api/analytics/*`) and its raw lists, one page per family.
 * Sales (bars with a target read off the response, a line, an area, click →
 * page data), Mix (a donut that navigates to the genre's books, top authors,
 * the order funnel, a pyramid), Compare (bars + a right-axis line, a bubble
 * scatter over the books), Patterns (a heatmap, two radars), KPIs (gauges).
 * No sign-in; needs `demo-api` on 9100: `VITE_GUMMY_PROJECT=charts-showcase`.
 */

export const CHARTS_PROJECT_ID = 'ch-project-charts'
const CREATED_AT = Date.UTC(2026, 9, 29)

const P = {
  sales: 'ch-page-sales',
  mix: 'ch-page-mix',
  compare: 'ch-page-compare',
  patterns: 'ch-page-patterns',
  kpis: 'ch-page-kpis',
  genre: 'ch-page-genre',
} as const

const fmt = (patch: Partial<ColumnFormatConfig>): ColumnFormatConfig => ({ ...defaultColumnFormat(), ...patch })
const THB = fmt({ type: 'currency', currency: 'THB', decimals: 0 })
const COUNT = fmt({ type: 'number', decimals: 0 })
const PCT = fmt({ type: 'percent', decimals: 1, percentOf: '100' })
const DAY = fmt({ type: 'date', pattern: 'D MMM' })
const MONTH = fmt({ type: 'date', pattern: 'MMM YYYY' })

const series = (id: string, field: string, label: string, format: ColumnFormatConfig, extra: Partial<ChartSeriesConfig> = {}): ChartSeriesConfig => ({
  ...createDefaultChartSeries(id, field, label),
  format,
  ...extra,
})
const axis = (patch: Partial<ChartConfig['yAxis']>, grid = true) => ({ ...createDefaultChartAxis(grid), ...patch })
const by = (value: 'day' | 'week' | 'month', id: string) => [{ id, slot: 'query' as const, key: 'by', source: { type: 'value' as const, value } }]

/* ------------------------------------------------------------------ sales */

function salesPage(): PageDef {
  return page(P.sales, 'sales', 'Sales', '/', [
    ...heading(
      'ch-item-sales-h',
      'Sales',
      'Revenue per week over the 90-day history, with the target the API sends beside the rows (`target.revenue`, a reference line by path). Click a bar: the week lands in page data `weeklySelected` and the block beside it reads it back.',
    ),
    chart(
      'ch-item-sales-weekly',
      {
        name: 'weekly',
        title: 'Revenue by week',
        subtitle: 'Bars · target read off the response · click a bar',
        endpointId: E.salesSeries,
        requestMapping: by('week', 'ch-rm-weekly-by'),
        xField: 'period',
        xFormat: DAY,
        series: [series('ch-s-weekly-rev', 'revenue', 'Revenue', THB)],
        yAxis: axis({ format: COUNT }),
        referenceLines: [{ id: 'ch-rl-weekly-target', label: 'Target', value: 'target.revenue', axis: 'y', color: 'amber', dashed: true }],
        clickState: { enabled: true, stateKey: 'weeklySelected' },
      },
      { xs: 4, sm: 6, md: 5, lg: 8 },
    ),
    html(
      'ch-item-sales-selected',
      'weeklyDatum',
      '<p class="dt-muted">Clicked week</p><dl><dt>Week of</dt><dd><strong>{{label}}</strong></dd><dt>Orders</dt><dd>{{orders}}</dd><dt>Items</dt><dd>{{items}}</dd><dt>Revenue</dt><dd>{{revenueText}}</dd></dl><p class="dt-muted">Click the same bar again to clear it.</p>',
      state('weeklySelected'),
      { xs: 4, sm: 6, md: 3, lg: 4 },
    ),
    chart('ch-item-sales-daily', {
      name: 'daily',
      title: 'Orders per day',
      subtitle: 'Line · smooth · no markers · the target line from the same response',
      endpointId: E.salesSeries,
      requestMapping: by('day', 'ch-rm-daily-by'),
      type: 'line',
      xField: 'period',
      xFormat: DAY,
      series: [series('ch-s-daily-orders', 'orders', 'Orders', COUNT, { color: 'teal' })],
      options: { smooth: true, showMarkers: false },
      yAxis: axis({ format: COUNT, min: '0' }),
      referenceLines: [{ id: 'ch-rl-daily-target', label: 'Target', value: 'target.orders', axis: 'y', color: 'amber', dashed: true }],
    }),
    chart('ch-item-sales-monthly', {
      name: 'monthly',
      title: 'Items and orders by month',
      subtitle: 'Stacked area · a date format on the x axis',
      endpointId: E.salesSeries,
      requestMapping: by('month', 'ch-rm-monthly-by'),
      type: 'area',
      xField: 'period',
      xFormat: MONTH,
      series: [series('ch-s-monthly-items', 'items', 'Items', COUNT), series('ch-s-monthly-orders', 'orders', 'Orders', COUNT)],
      options: { stacked: true },
      yAxis: axis({ format: COUNT }),
      legend: { show: true, position: 'bottom' },
    }),
  ])
}

/* -------------------------------------------------------------------- mix */

function mixPage(): PageDef {
  return page(P.mix, 'mix', 'Mix', '/mix', [
    ...heading(
      'ch-item-mix-h',
      'Mix',
      'Parts of a whole. Click a slice of the donut to open that genre’s books — the slice’s row fills the page’s :genre param. The pyramid orders the cities by their customers.',
    ),
    chart(
      'ch-item-mix-genres',
      {
        name: 'genreShare',
        title: 'Revenue by genre',
        subtitle: 'Donut · centerText $total · the legend names the slices · click one',
        endpointId: E.genreStats,
        type: 'pie',
        xField: 'genre',
        series: [series('ch-s-genres-rev', 'revenue', 'Revenue', THB)],
        options: { innerRadius: '58%', centerText: '$total', labelPosition: 'none' },
        legend: { show: true, position: 'right' },
        clickNavigate: navigate(P.genre, { genre: rowParam('genreId') }),
        clickState: { enabled: true, stateKey: 'genreSelected' },
      },
      THIRD,
    ),
    chart(
      'ch-item-mix-authors',
      {
        name: 'topAuthors',
        title: 'Best-selling authors',
        subtitle: 'Horizontal bars · one series, so no legend',
        endpointId: E.authorStats,
        requestMapping: [{ id: 'ch-rm-authors-limit', slot: 'query', key: 'limit', source: { type: 'value', value: '8' } }],
        xField: 'author',
        series: [series('ch-s-authors-rev', 'revenue', 'Revenue', THB, { color: 'plum' })],
        options: { orientation: 'horizontal', barMaxWidth: '22' },
        yAxis: axis({ format: COUNT }),
        showDataLabels: true,
      },
      THIRD,
    ),
    chart(
      'ch-item-mix-funnel',
      {
        name: 'pipeline',
        title: 'Order pipeline',
        subtitle: 'Funnel · stages the orders reached',
        endpointId: E.orderFunnel,
        type: 'funnel',
        xField: 'stage',
        series: [series('ch-s-funnel-orders', 'orders', 'Orders', COUNT)],
        options: { labelPosition: 'inside', sort: 'none' },
        showDataLabels: true,
        legend: { show: false, position: 'top' },
      },
      THIRD,
    ),
    chart(
      'ch-item-mix-cities',
      {
        name: 'cities',
        title: 'Customers by city',
        subtitle: 'Pyramid · labels outside',
        endpointId: E.cityStats,
        type: 'funnel',
        xField: 'city',
        series: [series('ch-s-cities-customers', 'customers', 'Customers', COUNT)],
        options: { funnelShape: 'pyramid', labelPosition: 'outside' },
        height: '280px',
      },
      HALF,
    ),
    chart(
      'ch-item-mix-statuses',
      {
        name: 'statuses',
        title: 'Orders by status',
        subtitle: 'Bars in pipeline order · revenue as a data label would mislead, so the count is shown',
        endpointId: E.statusStats,
        xField: 'label',
        series: [series('ch-s-statuses-orders', 'orders', 'Orders', COUNT, { color: 'indigo' })],
        yAxis: axis({ format: COUNT }),
        showDataLabels: true,
        height: '280px',
      },
      HALF,
    ),
  ])
}

/* ---------------------------------------------------------------- compare */

function comparePage(): PageDef {
  return page(P.compare, 'compare', 'Compare', '/compare', [
    ...heading(
      'ch-item-compare-h',
      'Compare',
      'Two measures on one chart: revenue as bars on the left axis and orders as a line on the right (use the right axis only when the scales differ — readers compare heights). Below, every book as a bubble: price against rating, the bubble sized by its page count, one series per genre.',
    ),
    chart(
      'ch-item-compare-combo',
      {
        name: 'revenueOrders',
        title: 'Revenue and orders by week',
        subtitle: 'barLine · orders on the right axis',
        endpointId: E.salesSeries,
        requestMapping: by('week', 'ch-rm-combo-by'),
        type: 'barLine',
        xField: 'period',
        xFormat: DAY,
        series: [
          series('ch-s-combo-rev', 'revenue', 'Revenue', THB),
          series('ch-s-combo-orders', 'orders', 'Orders', COUNT, { shape: 'line', axis: 'right', color: 'orange' }),
        ],
        yAxis: axis({ title: 'Revenue', format: COUNT }),
        yAxisRight: axis({ title: 'Orders', format: COUNT, min: '0' }, false),
        options: { smooth: true },
      },
      FULL,
    ),
    chart(
      'ch-item-compare-books',
      {
        name: 'booksScatter',
        title: 'Price against rating',
        subtitle: 'Bubble · size = pages · splitBy: genre · over the raw books list',
        endpointId: E.listBooks,
        type: 'scatter',
        splitBy: 'genreName',
        series: [series('ch-s-books-rating', 'rating', 'Rating', fmt({ type: 'number', decimals: 1 }))],
        options: { xField: 'price', sizeField: 'pages' },
        xAxis: axis({ title: 'Price (THB)', format: COUNT }, false),
        yAxis: axis({ title: 'Rating', format: fmt({ type: 'number', decimals: 1 }), min: '0', max: '5' }),
        referenceLines: [{ id: 'ch-rl-books-rating', label: 'Rating 4', value: '4', axis: 'y', color: 'grass', dashed: true }],
        legend: { show: true, position: 'bottom' },
        height: '400px',
      },
      FULL,
    ),
  ])
}

/* --------------------------------------------------------------- patterns */

function patternsPage(): PageDef {
  return page(P.patterns, 'patterns', 'Patterns', '/patterns', [
    ...heading(
      'ch-item-patterns-h',
      'Patterns',
      'When orders come in, as a weekday × hour heatmap on the accent ramp, and how the genres compare on five 0–100 scores — the same radar as a polygon and as a circle.',
    ),
    chart(
      'ch-item-patterns-heat',
      {
        name: 'orderHeat',
        title: 'Orders by weekday and hour',
        subtitle: 'Heatmap · values in the cells',
        endpointId: E.orderHeat,
        type: 'heatmap',
        xField: 'hour',
        series: [series('ch-s-heat-orders', 'orders', 'Orders', COUNT)],
        options: { yField: 'weekday', valueField: 'orders', showValues: true },
        xAxis: axis({ title: 'Hour' }, false),
        height: '300px',
      },
      FULL,
    ),
    chart('ch-item-patterns-radar', {
      name: 'genreRadar',
      title: 'Genre scorecard',
      subtitle: 'Radar · splitBy: genre · eight series, the palette’s full run',
      endpointId: E.genreScores,
      type: 'radar',
      xField: 'metric',
      splitBy: 'genre',
      series: [series('ch-s-radar-score', 'score', 'Score', COUNT)],
      options: { radarMax: '100' },
      legend: { show: true, position: 'right' },
      height: '360px',
    }),
    chart('ch-item-patterns-radar-circle', {
      name: 'genreRadarCircle',
      title: 'Same scores, circle',
      subtitle: 'radarShape: circle · legend bottom · toggle a genre in the legend',
      endpointId: E.genreScores,
      type: 'radar',
      xField: 'metric',
      splitBy: 'genre',
      series: [series('ch-s-radar2-score', 'score', 'Score', COUNT)],
      options: { radarShape: 'circle', radarMax: '100' },
      legend: { show: true, position: 'bottom' },
      height: '360px',
    }),
  ])
}

/* ------------------------------------------------------------------- kpis */

function kpisPage(): PageDef {
  const gauge = (id: string, name: string, key: string, title: string, subtitle: string, extra: Partial<Omit<ChartConfig, 'options'>> & { options?: Partial<ChartConfig['options']> }) =>
    chart(
      id,
      {
        name,
        title,
        subtitle,
        endpointId: E.kpis,
        requestMapping: [{ id: `${id}-key`, slot: 'query', key: 'key', source: { type: 'value', value: key } }],
        type: 'gauge',
        height: '240px',
        ...extra,
      },
      THIRD,
    )
  return page(P.kpis, 'kpis', 'KPIs', '/kpis', [
    ...heading(
      'ch-item-kpis-h',
      'KPIs',
      'One gauge per KPI row of `/api/analytics/kpis?key=`: radial with colour bands and a target tick, a linear one, and a rating out of five on the accent.',
    ),
    gauge('ch-item-kpis-fulfilment', 'fulfilment', 'fulfilment', 'Fulfilment rate', 'Radial · bands red → amber → grass · target 85', {
      series: [series('ch-s-kpi-fulfilment', 'value', 'Fulfilment', PCT)],
      options: {
        min: '0',
        max: '100',
        bands: [
          { id: 'ch-b-fulfilment-1', to: '60', color: 'red' },
          { id: 'ch-b-fulfilment-2', to: '80', color: 'amber' },
          { id: 'ch-b-fulfilment-3', to: '', color: 'grass' },
        ],
      },
      referenceLines: [{ id: 'ch-rl-fulfilment', label: 'Target', value: '85', axis: 'y', color: 'amber', dashed: false }],
    }),
    gauge('ch-item-kpis-refunds', 'refunds', 'refunds', 'Refund rate', 'Linear · lower is better · target 5', {
      series: [series('ch-s-kpi-refunds', 'value', 'Refunds', PCT, { color: 'crimson' })],
      options: {
        gaugeShape: 'linear',
        min: '0',
        max: '20',
        bands: [
          { id: 'ch-b-refunds-1', to: '5', color: 'grass' },
          { id: 'ch-b-refunds-2', to: '10', color: 'amber' },
          { id: 'ch-b-refunds-3', to: '', color: 'red' },
        ],
      },
      referenceLines: [{ id: 'ch-rl-refunds', label: 'Target', value: '5', axis: 'y', color: '', dashed: false }],
      height: '140px',
    }),
    gauge('ch-item-kpis-rating', 'rating', 'rating', 'Average rating', 'Radial · 0 – 5 · no bands (the accent fills the arc)', {
      series: [series('ch-s-kpi-rating', 'value', 'Rating', fmt({ type: 'number', decimals: 2 }))],
      options: { min: '0', max: '5' },
      referenceLines: [{ id: 'ch-rl-rating', label: 'Goal', value: '4', axis: 'y', color: 'grass', dashed: false }],
    }),
    gauge('ch-item-kpis-stock', 'inStock', 'inStock', 'Titles in stock', 'Radial · bands · target 90', {
      series: [series('ch-s-kpi-stock', 'value', 'In stock', PCT)],
      options: {
        min: '0',
        max: '100',
        bands: [
          { id: 'ch-b-stock-1', to: '75', color: 'red' },
          { id: 'ch-b-stock-2', to: '90', color: 'amber' },
          { id: 'ch-b-stock-3', to: '', color: 'grass' },
        ],
      },
      referenceLines: [{ id: 'ch-rl-stock', label: 'Target', value: '90', axis: 'y', color: 'amber', dashed: false }],
    }),
  ])
}

/* ------------------------------------------------------------------ genre */

/** The donut's click-through: that genre's books, the `:genre` param feeding the list's query. */
function genrePage(): PageDef {
  return page(
    P.genre,
    'genreBooks',
    'Books in a genre',
    '/genre/:genre',
    [
      { ...navButton('ch-item-genre-back', 'Back to Mix', 'chevronLeft', navigate(P.mix), 'text'), settings: settings(FULL) },
      typo('ch-item-genre-caption', 'The books of the genre picked on the Mix page — the donut’s clicked slice filled this page’s :genre, and the list reads it from the URL.', 'body2', { color: 'gray' }),
      table('ch-item-genre-books', {
        name: 'genreBooks',
        title: 'Books',
        endpointId: E.listBooks,
        apiPaths: 'data',
        canSearchAllColumns: true,
        cellLines: 1,
        requestMapping: [{ id: 'ch-rm-genre', slot: 'query', key: 'genre', source: urlParam('genre') }],
        columns: [
          column('ch-col-genre-cover', 'cover', '', { html: COVER_CELL, size: 64, resizable: false }),
          column('ch-col-genre-title', 'title', 'Title', { enableSorting: true, size: 280 }),
          column('ch-col-genre-author', 'authorName', 'Author', { enableSorting: true, size: 200 }),
          column('ch-col-genre-price', 'price', 'Price', { enableSorting: true, format: fmt({ type: 'currency', currency: 'THB' }), size: 140 }),
          column('ch-col-genre-stock', 'stock', 'Stock', { enableSorting: true, format: COUNT, size: 100 }),
          column('ch-col-genre-rating', 'rating', 'Rating', { enableSorting: true, format: fmt({ type: 'number', decimals: 1 }), size: 100 }),
        ],
      }),
    ],
    { parentId: P.mix, crumb: { type: 'url', key: 'genre', source: 'param' } },
  )
}

export function chartsPages(): PageDef[] {
  return [salesPage(), mixPage(), comparePage(), patternsPage(), kpisPage(), genrePage()]
}

/* ------------------------------------------------------------------ shell */

function chartsMenu(): MenuItemDef[] {
  const link = (id: string, label: string, icon: string, pageId: string): MenuItemDef => ({ id, kind: 'page', label, icon, navigate: navigate(pageId) })
  return [
    link('ch-menu-sales', 'Sales', 'chartBar', P.sales),
    link('ch-menu-mix', 'Mix', 'chartPie', P.mix),
    link('ch-menu-compare', 'Compare', 'chartBarLine', P.compare),
    link('ch-menu-patterns', 'Patterns', 'heatmap', P.patterns),
    link('ch-menu-kpis', 'KPIs', 'gauge', P.kpis),
  ]
}

function chartsShell(): ShellSettings {
  const base = defaultShell('Charts')
  return {
    ...base,
    appBar: { ...base.appBar, title: 'Charts', icon: 'chartLine', variant: 'accent' },
    pageTransition: { type: 'fade', duration: '', easing: 'ease-out' },
    locale: 'en-US',
  }
}

function chartsTheme(): StudioThemeConfig {
  return {
    appearance: 'light',
    accentColor: 'indigo',
    radius: 'medium',
    panelBackground: 'solid',
    surface: 'flat',
    background: createDefaultBackdrop(),
    buttonColor: '',
    dataTable: {
      headerColor: '',
      headerTextColor: '',
      headerFontSize: 'sm',
      headerFontWeight: 'semibold',
      headerHoverColor: '',
      paginationButtonColor: '',
      paginationButtonHoverColor: '',
      rowHoverColor: '',
      editButtonColor: '',
      deleteButtonColor: '',
    },
  }
}

const chartsEnv = (): EnvVarDef[] => [{ id: 'ch-env-api-url', name: 'API_URL', value: 'http://localhost:9100', locked: true }]

/** The library endpoints the pages use (shared with the Book shop). */
const CHARTS_ENDPOINTS = [E.salesSeries, E.genreStats, E.statusStats, E.authorStats, E.cityStats, E.orderHeat, E.kpis, E.orderFunnel, E.genreScores, E.listBooks]

export function chartsProject(): ProjectDef {
  return {
    id: CHARTS_PROJECT_ID,
    name: 'Charts showcase',
    description: 'The config-driven chart’s ten types over the Book shop’s analytics: bars with a target off the response, lines and areas, a donut that opens a genre, a funnel, a bar + line, a bubble scatter, a heatmap, radars and gauges.',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    snapshot: {
      pages: chartsPages(),
      menu: chartsMenu(),
      shell: chartsShell(),
      env: chartsEnv(),
      theme: chartsTheme(),
      endpointIds: [...CHARTS_ENDPOINTS],
      globalLoads: [],
      customActions: [],
      customComponents: [],
      authId: null,
    },
  }
}

export const CHARTS_KEY = projectKey('Charts showcase')
