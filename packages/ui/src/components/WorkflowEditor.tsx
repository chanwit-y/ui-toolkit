
import { Plus } from "lucide-react";
import { forwardRef, useEffect, useMemo, useState } from "react";
import type { WorkflowEditorLabels, WorkflowEditorProps, WorkflowRole } from "./@types";
import { ButtonBase } from "./Button";
import { ConfirmBox } from "./ConfirmBox";
import { Modal } from "./Modal";
import { MultiAutocompleteBase } from "./MultiAutocomplete";
import { RadioButtonBase } from "./RadioButton";
import { useReadApi } from "./core/useReadApi";
import {
  assignedUserIds,
  insertAllowed,
  insertStep,
  placeFor,
  removeStep,
  replaceStep,
  roleAvailable,
  stepKeysOf,
  stepsFromValue,
  userId,
  userLabel,
  usersOf,
  type WorkflowStep,
} from "./core/workflowSteps";

const DEFAULT_LABELS: Required<WorkflowEditorLabels> = {
  add: "Add Line Approval",
  save: "Save",
  remove: "Remove",
  cancel: "Cancel",
  dialogTitle: "Add Line Approval",
  editTitle: "Edit Line Approval",
  roleField: "Action Type",
  incharge: "Incharge Person",
  cc: "CC Person",
  userPlaceholder: "Add User",
  alreadyAssigned: "(Already assigned.)",
  confirmTitle: "Remove this step?",
  confirmDescription: "The step and its people are taken off the line.",
  empty: "No steps yet.",
};

/** Where the dialog is: inserting at `at`, or editing the step at `at`. */
type DialogState = { mode: "insert" | "edit"; at: number } | null;

type DialogProps = {
  id: string;
  state: NonNullable<DialogState>;
  steps: WorkflowStep[];
  roles: WorkflowRole[];
  keys: ReturnType<typeof stepKeysOf>;
  users: WorkflowEditorProps["users"];
  minInchargeUsers: number;
  allowDuplicateUsers: boolean;
  labels: Required<WorkflowEditorLabels>;
  onClose: () => void;
  onSave: (step: WorkflowStep) => void;
  onRemove: () => void;
};

/**
 * The add / edit dialog (the library `Modal`): the role radios — one at its
 * `max` is disabled with "(Already assigned.)" —, the in-charge and CC
 * pickers (`MultiAutocompleteBase` over the user list, loaded once through
 * `users.api` when the dialog opens; users already stored on the step are
 * merged in so their chips render even when the list hasn't), and Cancel ·
 * Remove (edit mode, confirmed) · Add / Save. What is stored per picked user
 * is the whole option object — the backend wants user objects back.
 */
function StepDialog({ id, state, steps, roles, keys, users, minInchargeUsers, allowDuplicateUsers, labels, onClose, onSave, onRemove }: DialogProps) {
  const editing = state.mode === "edit" ? steps[state.at] : undefined;
  const editingIndex = state.mode === "edit" ? state.at : undefined;
  const firstFree = roles.find((r) => roleAvailable(r, steps, keys, editingIndex));
  const [role, setRole] = useState<string>(String(editing?.[keys.role] ?? firstFree?.value ?? ""));
  const [incharge, setIncharge] = useState<WorkflowStep[]>(usersOf(editing, keys.incharge));
  const [cc, setCc] = useState<WorkflowStep[]>(usersOf(editing, keys.cc));
  const [confirming, setConfirming] = useState(false);

  const read = useReadApi(`${id}-users`, users.api);
  const options = useMemo<WorkflowStep[]>(() => {
    const fetched = users.api ? (Array.isArray(read.data) ? (read.data as WorkflowStep[]) : []) : (users.options ?? []);
    // Stored users not in the list (a left employee, a list not loaded yet) still need an option to show their chip.
    const known = new Set(fetched.map((u) => userId(u, users.keys)));
    const extra = [...incharge, ...cc].filter((u) => !known.has(userId(u, users.keys)));
    return [...fetched, ...extra];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [read.data, users.options, users.keys, incharge.length, cc.length]);
  const byId = useMemo(() => new Map(options.map((u) => [userId(u, users.keys), u])), [options, users.keys]);
  // People in charge elsewhere on the line are not offered again.
  const taken = useMemo(
    () => (allowDuplicateUsers ? new Set<string>() : assignedUserIds(steps, keys, users.keys, editingIndex)),
    [allowDuplicateUsers, steps, keys, users.keys, editingIndex],
  );
  const inchargeOptions = useMemo(() => options.filter((u) => !taken.has(userId(u, users.keys))), [options, taken, users.keys]);
  const pick = (ids: string[]) => ids.map((v) => byId.get(v)).filter((u): u is WorkflowStep => !!u);
  const canSave = !!role && incharge.length >= minInchargeUsers;
  const roleOptions = roles.map((r) => {
    const ok = roleAvailable(r, steps, keys, editingIndex);
    return { value: r.value, label: ok ? r.label : `${r.label} ${labels.alreadyAssigned}`, disabled: !ok };
  });
  const searchKey = users.keys.search ?? users.keys.display;

  return (
    <Modal
      id={id}
      open
      hiddenTrigger
      onOpenChange={(open) => !open && onClose()}
      title={state.mode === "edit" ? labels.editTitle : labels.dialogTitle}
      width="min(92vw, 40rem)"
    >
      <div className="workflow-dialog">
        <RadioButtonBase
          label={labels.roleField}
          options={roleOptions}
          value={role}
          onValueChange={setRole}
          orientation="horizontal"
        />
        <div className="workflow-dialog-section">
          <MultiAutocompleteBase
            label={labels.incharge}
            placeholder={labels.userPlaceholder}
            options={inchargeOptions}
            idKey={users.keys.id}
            displayKey={users.keys.display}
            searchKey={searchKey}
            itemSubtitle={users.keys.subtitle}
            itemAvatar={users.keys.avatar}
            values={incharge.map((u) => userId(u, users.keys))}
            onValuesChange={(ids) => setIncharge(pick(ids))}
            helperText={read.isLoading ? "Loading users…" : undefined}
          />
        </div>
        <div className="workflow-dialog-section">
          <MultiAutocompleteBase
            label={labels.cc}
            placeholder={labels.userPlaceholder}
            options={options}
            idKey={users.keys.id}
            displayKey={users.keys.display}
            searchKey={searchKey}
            itemSubtitle={users.keys.subtitle}
            itemAvatar={users.keys.avatar}
            values={cc.map((u) => userId(u, users.keys))}
            onValuesChange={(ids) => setCc(pick(ids))}
          />
        </div>
        <div className="workflow-dialog-actions">
          <ButtonBase label={labels.cancel} variant="outlined" onClick={onClose} />
          {state.mode === "edit" && <ButtonBase label={labels.remove} variant="outlined" color="red" onClick={() => setConfirming(true)} />}
          <ButtonBase
            label={state.mode === "edit" ? labels.save : labels.add}
            disabled={!canSave}
            onClick={() => canSave && onSave({ ...(editing ?? {}), [keys.role]: role, [keys.incharge]: incharge, [keys.cc]: cc })}
          />
        </div>
      </div>
      {confirming && (
        <ConfirmBox
          id={`${id}-confirm`}
          open
          onOpenChange={(open) => !open && setConfirming(false)}
          title={labels.confirmTitle}
          description={labels.confirmDescription}
          onConfirm={(yes) => {
            setConfirming(false);
            if (yes) onRemove();
          }}
        />
      )}
    </Modal>
  );
}

/**
 * The editor itself (see {@link WorkflowEditorElement}): an `<ol>` of step
 * cards joined by connectors, a "+" on each connector where the role rules
 * allow an insert, the add button at the end; clicking a card edits it. All
 * edits go through `onChange` with the renumbered array — the page's form
 * saves it. `disabled` draws the line read-only.
 */
const WorkflowEditorBase = forwardRef<HTMLDivElement, WorkflowEditorProps>(function WorkflowEditorBase(
  {
    name = "workflow",
    label,
    helperText,
    error,
    errorMessage,
    value,
    defaultValue: _defaultValue,
    onChange,
    onBlur,
    roles,
    stepKeys,
    users,
    minInchargeUsers = 1,
    allowDuplicateUsers = false,
    labels: labelOverrides,
    disabled = false,
    className,
  },
  ref,
) {
  const keys = useMemo(() => stepKeysOf(stepKeys), [stepKeys]);
  const labels = useMemo(() => ({ ...DEFAULT_LABELS, ...labelOverrides }), [labelOverrides]);
  const steps = useMemo(() => stepsFromValue(value, keys), [value, keys]);
  const [dialog, setDialog] = useState<DialogState>(null);
  // Close an open dialog if the line changes under it (a form reset).
  useEffect(() => {
    if (dialog && dialog.mode === "edit" && !steps[dialog.at]) setDialog(null);
  }, [steps, dialog]);

  const commit = (next: WorkflowStep[]) => {
    onChange?.(next);
    onBlur?.();
  };
  const roleOf = (step: WorkflowStep) => roles.find((r) => r.value === step[keys.role]);
  const names = (step: WorkflowStep, field: string) => usersOf(step, field).map((u) => userLabel(u, users.keys)).join(", ");
  const plus = (at: number) =>
    !disabled && insertAllowed(at, steps, roles, keys) ? (
      <button type="button" className="workflow-insert" aria-label={`Insert a step at position ${at + 1}`} onClick={() => setDialog({ mode: "insert", at })}>
        <Plus aria-hidden />
      </button>
    ) : (
      <span className="workflow-insert workflow-insert-none" aria-hidden />
    );

  return (
    <div ref={ref} className={`workflow-editor ${disabled ? "workflow-editor-disabled" : ""} ${className ?? ""}`} data-workflow={name}>
      {label && <span className="workflow-label">{label}</span>}
      <div className={`workflow-frame ${error ? "workflow-frame-error" : ""}`}>
        {steps.length === 0 && <p className="workflow-empty">{labels.empty}</p>}
        <ol className="workflow-steps">
          {steps.map((step, i) => (
            <li key={i} className="workflow-step">
              {i > 0 && plus(i)}
              <button
                type="button"
                className="workflow-card"
                disabled={disabled}
                onClick={() => setDialog({ mode: "edit", at: i })}
                aria-label={`Step ${i + 1}: ${roleOf(step)?.label ?? String(step[keys.role] ?? "")}`}
              >
                <span className="workflow-card-role">{roleOf(step)?.label ?? String(step[keys.role] ?? "")}</span>
                <span className="workflow-card-users">{names(step, keys.incharge) || "—"}</span>
                {usersOf(step, keys.cc).length > 0 && <span className="workflow-card-cc">CC: {names(step, keys.cc)}</span>}
              </button>
            </li>
          ))}
        </ol>
        {!disabled && (
          <div className="workflow-add">
            {steps.length > 0 && plus(steps.length)}
            <ButtonBase label={labels.add} icon="puls" onClick={() => setDialog({ mode: "insert", at: steps.length })} />
          </div>
        )}
      </div>
      {helperText && !error && <p className="workflow-helper">{helperText}</p>}
      {error && errorMessage && <p className="workflow-error">{errorMessage}</p>}
      {dialog && (
        <StepDialog
          id={`${name}-step-dialog`}
          state={dialog}
          steps={steps}
          roles={roles}
          keys={keys}
          users={users}
          minInchargeUsers={minInchargeUsers}
          allowDuplicateUsers={allowDuplicateUsers}
          labels={labels}
          onClose={() => setDialog(null)}
          onSave={(step) => {
            const role = roleOf(step);
            const next =
              dialog.mode === "edit"
                ? replaceStep(steps, dialog.at, step, keys)
                : insertStep(steps, placeFor(role, dialog.at, steps, roles, keys), step, keys);
            setDialog(null);
            commit(next);
          }}
          onRemove={() => {
            if (dialog.mode !== "edit") return;
            const at = dialog.at;
            setDialog(null);
            commit(removeStep(steps, at, keys));
          }}
        />
      )}
    </div>
  );
});

export { WorkflowEditorBase };
