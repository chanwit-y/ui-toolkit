import { createElement, type JSX } from "react";
import type { FormListReadApi, IElement, WorkflowEditorElement } from "../@types";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import { WorkflowEditor as WorkflowEditorComponent } from "../form/WorkflowEditor";
import type { ElementContext } from "./elementBuilder";
import { resolveApiRef, urlParamNames } from "./readApi";

/**
 * `workfloweditor` Bin → the form-bound {@link WorkflowEditorComponent}. The
 * dialog's user list `users.api` is resolved against the ApiMaster like a
 * repeater's read; the field starts from the form's defaults (`[]` when none)
 * so a required line validates against an empty array, not `undefined`.
 */
export class WorkflowEditor<M extends TModelMaster, A extends TApiMaster<M>> implements IElement {
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const props = this._context.props as WorkflowEditorElement;
    let api: FormListReadApi | undefined;
    if (props.users.api) {
      const read = resolveApiRef(this._context, props.users.api.name);
      if (!read) throw new Error(`WorkflowEditor "${props.name}": API "${props.users.api.name}" was not found in ApiMaster`);
      api = { ...props.users.api, api: read.api, segments: read.segments, urlParams: urlParamNames(read.url) };
    }
    return createElement(WorkflowEditorComponent, {
      name: props.name,
      form: this._context.form,
      defaultValue: [],
      label: props.label,
      helperText: props.helperText,
      errorMessage: props.errorMessage,
      roles: props.roles,
      stepKeys: props.stepKeys,
      users: { api, options: props.users.options, keys: props.users.keys },
      minInchargeUsers: props.minInchargeUsers,
      allowDuplicateUsers: props.allowDuplicateUsers,
      labels: props.labels,
      disabled: props.disabled,
    });
  }
}
