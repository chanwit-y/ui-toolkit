# datatableeditable

A table edited in place, row by row, over four endpoints: `readEndpointId`,
`createEndpointId`, `updateEndpointId`, `deleteEndpointId` with `canCreate` /
`canUpdate` / `canDelete`; `idKey` names the row id.

`columns: [{ id, accessorKey, header, editable, editor, options, isRequired,
requiredMessage, min, max, minLength, maxLength, pattern, patternMessage,
enableSorting, align, rowHeader, group, size… }]` — `editor` picks the cell
input, `options` feeds a select editor.

Note: the studio cannot author where the rows sit in the read response, so
prefer a `datatable` with its edit modal unless in-place editing is the point.
