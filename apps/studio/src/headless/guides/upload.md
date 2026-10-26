# uploadimage, uploadfile

Both store what was uploaded in the form under `config.name`, in the form
`valueFormat` says: `dataUrl` / `base64` / `bytes` (inline), or `api` — each
file is POSTed to `api.uploadUrl` (multipart field `api.fieldName`) and the
value is the URL read from the response at `api.responsePath`; `api.deleteUrl`
(optional) removes a replaced file.

- **uploadimage** — one hero image: `accept` (e.g. `image/*`), `maxSizeMB`,
  `shape` (`square | circle`), `previewHeight`.
- **uploadfile** — the general uploader: `multiple` (+ `maxFiles`),
  `acceptPresets` (`image`, `pdf`, `document`, `spreadsheet`, `presentation`,
  `text`, `archive`, `audio`, `video`) plus free `accept` tokens (`.dwg`),
  `maxSizeMB`, `preview` + `previewLayout` (`list | grid`). Its value is always
  a list of files.

```json
{ "type": "uploadimage", "config": { "name": "cover", "label": "Cover", "maxSizeMB": 5, "valueFormat": "api",
  "api": { "uploadUrl": "/api/uploads", "deleteUrl": "", "fieldName": "file", "responsePath": "data.url" } } }
```
