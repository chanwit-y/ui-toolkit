import { createElement, type JSX, type ReactNode } from "react";
import type { ApiMaster, TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { Bin, ButtonElement, CardElement, Container, DataValue, IElement, TElement, ThemeContextType } from "../@types";
import { CardView } from "../Card";
import { useData } from "../context/DataProvider";
import { ContainerBuilder, ContainerGrid } from "./containerBuilder";
import { ElementContext } from "./elementBuilder";
import { useRowScope } from "./rowScope";
import { skeletonBindingKeys } from "./stateStore";

/**
 * The page-data bindings of a container's bins (their `value`, an avatar's
 * `srcValue`, a table's / repeater's `items`), through tab panels and nested
 * cards, so a card in `loading: "card"` mode can wait for them as one.
 */
export function containerStateValues(container: Container | undefined): DataValue[] {
  if (!container) return [];
  const out: DataValue[] = [];
  const visit = (bins: Bin[] | undefined) => {
    for (const bin of bins ?? []) {
      const el = bin.element as Record<string, unknown> | undefined;
      if (!el) continue;
      for (const key of ["value", "srcValue", "fallbackValue", "titleValue", "subheaderValue", "items", "optionsValue"]) {
        const dv = el[key] as DataValue | undefined;
        if (dv && typeof dv === "object" && skeletonBindingKeys([dv]).length) out.push(dv);
      }
      const media = el.media as { srcValue?: DataValue } | undefined;
      if (media?.srcValue && skeletonBindingKeys([media.srcValue]).length) out.push(media.srcValue);
      for (const key of ["content", "collapse", "container"]) visit((el[key] as Container | undefined)?.bins);
      for (const tab of (el.tabs as { container?: Container }[] | undefined) ?? []) visit(tab.container?.bins);
    }
  };
  visit(container.bins);
  return out;
}

type Apis = ApiMaster<TModelMaster, TApiMaster<TModelMaster>>;

type CardBinsProps = {
  container: Container;
  builder: ContainerBuilder<TModelMaster, TApiMaster<TModelMaster>>;
  form: unknown;
  theme: ThemeContextType | undefined;
};

/**
 * A card slot's bins, drawn on the enclosing form (no form of their own, so a
 * field in a card belongs to the page's form) with the bin `condition`s seeing
 * the repeater item when there is one — `{ row, index }`, as in the item
 * template — else the container's `contextData` slice, as anywhere else.
 */
function CardBins({ container, builder, form, theme }: CardBinsProps) {
  const scope = useRowScope();
  const { contextData } = useData();
  const ctx = scope ? { row: scope.row, index: scope.index } : contextData?.[container.contextData ?? ""] ?? {};
  return createElement(ContainerGrid, { container, builder, form, theme, ctx });
}

/**
 * Builds the `card` element: the header avatar / action and the footer
 * buttons go through their own element builders (so a header action can be a
 * popover / modal trigger and the buttons keep every action), the `content`
 * and `collapse` containers are drawn by `CardBins`, and `CardView` puts the
 * slots together and resolves the bound title / subheader / media.
 */
export class Card<M extends TModelMaster, A extends TApiMaster<M>> implements IElement {
  constructor(private _context: ElementContext<M, A>) {}

  private element(type: "button" | "avatar", element: TElement): ReactNode {
    const built = new ElementContext<M, A>(element)
      .APIs(this._context.apis as ApiMaster<M, A> | undefined)
      .Form(this._context.form)
      .Fns(this._context.fns)
      .Theme(this._context.theme)
      .build(type);
    return built ? built.create() : null;
  }

  private bins(container: Container | undefined): ReactNode {
    if (!container) return undefined;
    const apis = this._context.apis as unknown as Apis;
    const builder = new ContainerBuilder([container], apis);
    return createElement(CardBins, { container, builder, form: this._context.form, theme: this._context.theme });
  }

  create(): JSX.Element {
    const props = this._context.props as CardElement;
    const header = props.header;

    return createElement(CardView, {
      title: header?.title,
      titleValue: header?.titleValue,
      subheader: header?.subheader,
      subheaderValue: header?.subheaderValue,
      avatar: header?.avatar ? this.element("avatar", header.avatar as TElement) : undefined,
      headerAction: header?.action ? this.element("button", { variant: "text", ...header.action } as ButtonElement) : undefined,
      media: props.media,
      content: this.bins(props.content),
      actions: (props.actions ?? []).map((button, i) =>
        createElement("span", { key: `${button.label}-${i}`, className: "contents" }, this.element("button", button as TElement)),
      ),
      actionsAlign: props.actionsAlign,
      collapse: this.bins(props.collapse),
      collapseLabel: props.collapseLabel,
      defaultExpanded: props.defaultExpanded,
      navigate: props.navigate,
      variant: props.variant,
      elevation: props.elevation,
      square: props.square,
      loading: props.loading,
      skeletonDelay: props.skeletonDelay,
      contentValues: props.loading === "card" ? [...containerStateValues(props.content), ...containerStateValues(props.collapse)] : undefined,
      className: props.className,
      style: props.style,
    });
  }
}
