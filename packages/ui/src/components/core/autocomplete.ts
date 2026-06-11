import { createElement, type JSX } from "react";
import {
  AutocompleteF2,
  MultiAutocomplete as MultiAutocompleteComponent,
} from "../form";
import type { AutocompleteElement, IElement } from "../@types";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import { ElementContext } from "./elementBuilder";

export class Autocomplete<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement {
  constructor(private _context: ElementContext<M, A>) { }

  public create(): JSX.Element {
    const props = this._context.props as AutocompleteElement;
    return createElement(AutocompleteF2, {
      name: props.name,
      form: this._context.form,
      label: props.label,
      subtitle: props.subtitle,
      searchKey: props.keys.search,
      idKey: props.keys.id,
      displayKey: props.keys.display,
      errorMessage: props.errorMessage,
      canObserve: props.canObserve,
      observeTo: props.observeTo,


      api: this._context.api,
      apiInfo: props.api,

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
    return createElement(MultiAutocompleteComponent, {
      name: props.name,
      form: this._context.form,
      placeholder: "Choose multiple items...",
      searchKey: props.keys.search,
      idKey: props.keys.id,
      displayKey: props.keys.display,
      errorMessage: props.errorMessage,
      api: this._context.api,
      canObserve: props.canObserve,
      observeTo: props.observeTo,
      apiInfo: props.api,

      // defaultData: props.defaultData ?? {},
      options: [], // Add required options property
      inputIcon: props.inputIcon,
    });
  }
}
