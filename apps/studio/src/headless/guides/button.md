# button

A button runs an **action chain** (`actions`, in order) on click — or, with
`mode: "confirm"`, opens a confirm box (`confirmTitle`, `confirmDescription`)
and runs `confirmTrue` / `confirmFalse`.

Actions:
- `StartLoading` / `StopLoading` — the page overlay around a submit.
- `SubmitFormToPostAPI` / `SubmitFormToPatchAPI` — validate the enclosing form
  and send its values to `endpointId`. A failed validation ends the chain.
  A URL `:id` is filled from the form's `_id` / `id` field.
- `CloseModal` — close `modalItemId` (a modal / drawer on the page); inside a
  data table's modal it closes that modal with no id.
- `Navigate` — go to `navigate: { pageId, params, replace }`.
- `ReloadDataTable` — refetch `reloadTableItemId` (a table, form list,
  repeater, or a page load by key).
- `ClearCurrentFormSelected`, `SignIn`, `SignOut`, and `"fn:<custom action>"`.

Feedback: `snackbarSuccessEnabled` + `snackbarSuccessType` +
`snackbarSuccessMessage`; `snackbarErrorException: true` shows the API error.
Look: `label`, `icon` (IconData key), `variant` (`contained | outlined | text`),
`color` (a Radix colour, `""` = theme).

```json
{ "label": "Save", "icon": "save", "mode": "confirm", "confirmTitle": "Save", "confirmDescription": "Save this book?",
  "confirmTrue": ["StartLoading", "SubmitFormToPatchAPI", "StopLoading", "CloseModal"],
  "endpointId": "updateBook", "reloadTableItemId": "books",
  "snackbarSuccessEnabled": true, "snackbarSuccessMessage": "Book saved", "snackbarErrorException": true }
```
