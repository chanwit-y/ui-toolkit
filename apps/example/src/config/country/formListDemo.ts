import type { Bin, Container } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Form list demo page (`/form-list`). Two `formlist` bins over the mock API's
 * `contacts` and `notes` resources:
 *
 * - **Contacts** — full CRUD. Each row is the `contactRow` container (name,
 *   email, a static-options role select); Save creates a draft or updates a
 *   persisted row (`update.params` maps `:id` to the row's `_id`), Remove
 *   confirms then deletes. Every mutation refetches `contacts`.
 * - **Notes** — starts empty (the `emptyText` state) and has no `update` API,
 *   so persisted rows render read-only while Add and Delete still work. It also
 *   moves the chrome: Add sits above the rows (right-aligned), Delete below
 *   each row as an icon-only button (the label becomes its tooltip).
 */
const contactRow: Container = {
  id: "contact-row",
  name: "ContactRow",
  isArray: false,
  bins: [
    {
      sm: "12", md: "4", lg: "4", xl: "4",
      type: "textfield",
      element: {
        name: "name",
        label: "Name",
        dataType: "string",
        isRequired: true,
        errorMessage: "Name is required",
      },
    },
    {
      sm: "12", md: "4", lg: "4", xl: "4",
      type: "textfield",
      element: {
        name: "email",
        label: "Email",
        dataType: "email",
        isRequired: false,
        errorMessage: "",
        placeholder: "name@example.com",
      },
    },
    {
      sm: "12", md: "4", lg: "4", xl: "4",
      type: "autocomplete",
      element: {
        name: "role",
        label: "Role",
        dataType: "string",
        isRequired: true,
        errorMessage: "Pick a role",
        canObserve: false,
        observeTo: "",
        isSingleLoad: false,
        inputIcon: "user",
        keys: { id: "value", search: "label", display: "label" },
        defaultData: {},
        options: [
          { value: "admin", label: "Admin" },
          { value: "editor", label: "Editor" },
          { value: "viewer", label: "Viewer" },
        ],
      },
    },
  ],
  ...DEFAULT_CONTAINER_GRID,
  gap: "3",
};

const noteRow: Container = {
  id: "note-row",
  name: "NoteRow",
  isArray: false,
  bins: [
    {
      sm: "12", md: "12", lg: "12", xl: "12",
      type: "textfield",
      element: {
        name: "text",
        label: "Note",
        dataType: "string",
        isRequired: true,
        errorMessage: "Write something first",
        placeholder: "What should the team remember?",
      },
    },
  ],
  ...DEFAULT_CONTAINER_GRID,
};

const contactsBins: Bin[] = [
  {
    sm: "12", md: "12", lg: "12", xl: "12",
    type: "text",
    element: {
      text: "Full CRUD: Save appears once a row is dirty; a blank row is created on Save, an existing one updated; Remove asks first, then deletes.",
      isLabel: true,
    },
  },
  {
    sm: "12", md: "12", lg: "12", xl: "12",
    type: "formlist",
    element: {
      name: "contacts",
      idKey: "_id",
      rowContainer: contactRow,
      addLabel: "Add contact",
      emptyText: "No contacts yet.",
      apiCrud: {
        read: { name: "contacts", paths: ["data"] },
        create: {
          name: "createContact",
          snackbarSuccess: { type: "success", message: "Contact created" },
          snackbarError: "$exception",
        },
        update: {
          name: "updateContact",
          params: { id: "_id" },
          snackbarSuccess: { type: "success", message: "Contact updated" },
          snackbarError: "$exception",
        },
        delete: {
          name: "deleteContact",
          params: { id: "_id" },
          confirmBox: { title: "Delete contact", description: "Remove this contact from the list?" },
          snackbarSuccess: { type: "success", message: "Contact deleted" },
          snackbarError: "$exception",
        },
      },
    },
  },
];

const notesBins: Bin[] = [
  {
    sm: "12", md: "12", lg: "12", xl: "12",
    type: "text",
    element: {
      text: "No update API: saved notes are read-only, but you can still add and delete. The list starts empty to show emptyText.",
      isLabel: true,
    },
  },
  {
    sm: "12", md: "12", lg: "12", xl: "12",
    type: "formlist",
    element: {
      name: "notes",
      idKey: "_id",
      rowContainer: noteRow,
      // Chrome placement demo: Add above the rows on the right, Remove below each row.
      addLabel: "Add note",
      addIcon: "puls",
      addPosition: "top",
      addAlign: "end",
      removeLabel: "Delete",
      removeIcon: "xCircle",
      removePosition: "below",
      removeDisplay: "icon",
      emptyText: "Nothing here yet — add the first note.",
      apiCrud: {
        read: { name: "notes", paths: ["data"] },
        create: {
          name: "createNote",
          snackbarSuccess: { type: "success", message: "Note added" },
          snackbarError: "$exception",
        },
        delete: {
          name: "deleteNote",
          params: { id: "_id" },
          confirmBox: { title: "Delete note", description: "Delete this note?" },
          snackbarSuccess: { type: "success", message: "Note deleted" },
          snackbarError: "$exception",
        },
      },
    },
  },
];

export const containerFormListDemo: Container[] = [
  {
    id: "form-list-contacts",
    name: "FormListContacts",
    isArray: false,
    bins: contactsBins,
    ...DEFAULT_CONTAINER_GRID,
    gap: "4",
    surface: { title: "Contacts" },
  },
  {
    id: "form-list-notes",
    name: "FormListNotes",
    isArray: false,
    bins: notesBins,
    ...DEFAULT_CONTAINER_GRID,
    gap: "4",
    surface: { title: "Notes" },
  },
];
