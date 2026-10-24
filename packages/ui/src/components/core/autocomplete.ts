import { createElement, type JSX } from "react";
import {
  AutocompleteF2,
  MultiAutocomplete as MultiAutocompleteComponent,
} from "../form";
import type { AutocompleteElement, IElement } from "../@types";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import { ElementContext } from "./elementBuilder";
import { BoundOptions } from "./bound";
import { resolveApiRef } from "./readApi";

/** The field as is, or behind {@link BoundOptions} when `optionsValue` is set. */
function withBoundOptions(props: AutocompleteElement, component: any, fieldProps: Record<string, unknown>): JSX.Element {
  return props.optionsValue
    ? createElement(BoundOptions, { component, optionsValue: props.optionsValue, props: fieldProps })
    : createElement(component, fieldProps);
}

export class Autocomplete<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement {
  constructor(private _context: ElementContext<M, A>) { }

  public create(): JSX.Element {
    const props = this._context.props as AutocompleteElement;
    return withBoundOptions(props, AutocompleteF2, {
      name: props.name,
      form: this._context.form,
      label: props.label,
      subtitle: props.subtitle,
      placeholder: props.placeholder,
      helperText: props.helperText,
      searchKey: props.keys.search,
      idKey: props.keys.id,
      displayKey: props.keys.display,
      errorMessage: props.errorMessage,
      canObserve: props.canObserve,
      observeTo: props.observeTo,


      api: this._context.api,
      apiInfo: props.api,
      apiSegments: resolveApiRef(this._context, props.api?.name)?.segments,

      enabledWhen: props.enabledWhen,

      // defaultData: props.defaultData ?? {},
      options: props.options ?? [], // Add required options property
      isSingleLoad: props.isSingleLoad,
      maxHeight: props.maxHeight,
      inputIcon: props.inputIcon,
      itemIcon: props.itemIcon,
      itemSubtitle: props.itemSubtitle as any,
      itemAvatar: props.itemAvatar as any,
    });
  }
}

export class MultiAutocomplete<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement {
  constructor(private _context: ElementContext<M, A>) { }

  public create(): JSX.Element {
    const props = this._context.props as AutocompleteElement;
    return withBoundOptions(props, MultiAutocompleteComponent, {
      name: props.name,
      form: this._context.form,
      label: props.label,
      subtitle: props.subtitle,
      placeholder: props.placeholder || "Choose multiple items...",
      helperText: props.helperText,
      searchKey: props.keys.search,
      idKey: props.keys.id,
      displayKey: props.keys.display,
      errorMessage: props.errorMessage,
      api: this._context.api,
      canObserve: props.canObserve,
      observeTo: props.observeTo,
      apiInfo: props.api,
      apiSegments: resolveApiRef(this._context, props.api?.name)?.segments,

      enabledWhen: props.enabledWhen,

      // defaultData: props.defaultData ?? {},
      options: props.options ?? [],
      maxHeight: props.maxHeight,
      maxSelections: props.maxSelections,
      showSelectedCount: props.showSelectedCount,
      inputIcon: props.inputIcon,
      itemIcon: props.itemIcon,
      itemSubtitle: props.itemSubtitle as any,
      itemAvatar: props.itemAvatar as any,
    });
  }
}
