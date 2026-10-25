# tab

Tabs whose headers are `config.tabs: [{ label, value }]`, each owning the
child canvas at the same index. Keep them aligned: **use `add_tab` /
`remove_tab`** — `update_item` refuses a patch that changes the number of
tabs (you may rename labels / values in place). `defaultValue` picks the open
tab (`""` = the first).

Each tab's canvas is part of the page's form, like a container.
