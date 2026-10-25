# Recipe: a list + edit CRUD page

Goal: `/books` lists books; Add and Edit open one modal form; Delete confirms.

1. Models (`upsert_model`): `book` (`_id`, `title`, `price: number`, …),
   `bookList` (`data: array of book`), `bookIdParams` (`id`).
2. Endpoints (`upsert_endpoint`): `listBooks` GET `/api/books` → `bookList`;
   `createBook` POST `/api/books` body `book`; `updateBook` PATCH
   `/api/books/:id` parameter `bookIdParams` body `book`; `deleteBook` DELETE
   `/api/books/:id` parameter `bookIdParams`. `attach_endpoints` all four.
3. `add_page` `{ name: "Books", path: "/books" }`.
4. In one `batch`:
   - `add_item` datatable → `{ name: "books", title: "Books", endpointId: "listBooks",
     apiPaths: "data", canEdit: true, canAdd: true, canDelete: true,
     deleteEndpointId: "deleteBook", deleteParams: { id: "_id" },
     columns: [ { id: "c-title", accessor: "title", header: "Title", … } ] }`
     (start from `describe_item_type datatable` defaults for a column);
   - into `parent: { item: "$1.id", canvas: 0 }` (the edit modal): a `hidden`
     `_id`, the inputs (`name` = row field), a **Create** button
     (`showWhen: "adding"`, `confirmTrue: [StartLoading, SubmitFormToPostAPI,
     StopLoading, CloseModal]`, `endpointId: createBook`, `reloadTableItemId: books`)
     and a **Save** button (`showWhen: "editing"`, `SubmitFormToPatchAPI`,
     `updateBook`).
5. Add a menu link to the page (phase 2 tools) and `validate_project`.
