import { createElement, type JSX, type ReactNode } from "react";
import type { ApiMaster, TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { ButtonElement, CardElement, Container, IElement, TElement, ThemeContextType } from "../@types";
import { CardView } from "../Card";
import { useData } from "../context/DataProvider";
import { ContainerBuilder, ContainerGrid } from "./containerBuilder";
import { ElementContext } from "./elementBuilder";
import { useRowScope } from "./rowScope";

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
      className: props.className,
      style: props.style,
    });
  }
}
