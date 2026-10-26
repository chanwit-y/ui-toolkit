# Recipe: a detail page over chained loads

Goal: `/books/:id` shows a book and its author, reached from the list.

1. Endpoints: `getBook` GET `/api/books/:id` (parameter `bookIdParams`,
   response `bookRes` with `data`), `getAuthor` GET `/api/authors/:id`.
2. `add_page { name: "Book", path: "/books/:id", parent: "books" }` (set
   `parent` with `update_page`).
3. Loads on the page:
   - `upsert_load { page: "book", key: "book", endpoint: "getBook", paths:
     "data", params: { id: { type: "url", key: "id", source: "param" } },
     loading: "skeleton" }`
   - `upsert_load { page: "book", key: "author", endpoint: "getAuthor",
     paths: "data", params: { id: { type: "state", key: "book", path:
     "authorId" } }, loading: "skeleton" }` — held until `book` arrives.
4. Items: a `typography` h3 bound to `book.title`, a `card` with
   `header.titleBinding` → `author.name` and `media.srcBinding` →
   `book.cover`, an `html` block over `book` for the description, and a
   "Back to books" `button` (`variant: "text"`, `Navigate` to `books`).
5. On the list page's table: `rowNavigate: { pageId: "book", params: { id:
   { type: "row", key: "_id" } }, replace: false }`.
6. `update_page { crumb: { type: "state", key: "book", path: "title" } }`
   for a breadcrumb label, then `validate_project`.
