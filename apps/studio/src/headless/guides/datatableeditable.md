# datatableeditable

A table edited in place, row by row, over four endpoints: `readEndpointId`,
`createEndpointId`, `updateEndpointId`, `deleteEndpointId` with `canCreate` /
`canUpdate` / `canDelete`; `idKey` names the row id.

`columns: [{ id, accessorKey, header, editable, editor, options, isRequired,
requiredMessage, min, max, minLength, maxLength, pattern, patternMessage,
enableSorting, align, format, rowHeader, group, size… }]` — `editor` picks the cell
input, `options` feeds a select editor, `format` (the datatable's) formats the
cell in read mode while the editor keeps the raw value; `cellStyles` (the
datatable's style rules) tint read-mode cells. `actionSize` (`"" | "1" | "2" | "3"`,
24 / 32 / 40px) sizes the row-action buttons (Edit / Delete / Save / Cancel).

Note: the studio cannot author where the rows sit in the read response, so
prefer a `datatable` with its edit modal unless in-place editing is the point.
