import { type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import type { NavigateTarget, RepeaterProps } from "./@types";
import { resolveContainerGap } from "./core/containerGrid";
import { useNavigateTo } from "./core/pages";
import { RowScopeProvider, useDataValue, useSkeleton } from "./core/rowScope";
import { SkeletonBlock } from "./Skeleton";
import { useReadApi } from "./core/useReadApi";

// Surfaces use the Radix theme vars so they follow the active appearance and
// accent; every class is a literal so Tailwind emits it.
const SURFACE_CLASS = {
	none: "",
	outlined: "rounded-lg border border-[var(--gray-a6)] bg-[var(--color-panel-solid)]",
	elevation: "rounded-lg bg-[var(--color-panel-solid)] shadow-md",
} as const;

const SURFACE_HOVER_CLASS = {
	none: "rounded-md hover:bg-[var(--gray-a3)]",
	outlined: "hover:border-[var(--accent-8)]",
	elevation: "hover:shadow-lg",
} as const;

const CLICKABLE_CLASS =
	"cursor-pointer outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent-8)]";

/** Controls inside an item keep their own click — they don't trigger `itemNavigate`. */
const INTERACTIVE = "a,button,input,select,textarea,label,[role='button'],[role='link'],[role='checkbox'],[role='tab']";

type ItemProps = {
	item: unknown;
	index: number;
	spanClass: string;
	surface: keyof typeof SURFACE_CLASS;
	padding: string;
	navigate: NavigateTarget | undefined;
	children: ReactNode;
};

/** One item: its grid cell, optional card surface and link behaviour, with the item in scope. */
function RepeaterItem({ item, index, spanClass, surface, padding, navigate, children }: ItemProps) {
	const navigateTo = useNavigateTo();
	const go = () => navigateTo(navigate, { row: item });

	const onClick = (e: MouseEvent<HTMLDivElement>) => {
		const hit = (e.target as HTMLElement).closest(INTERACTIVE);
		if (hit && hit !== e.currentTarget) return;
		go();
	};
	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
		e.preventDefault();
		go();
	};

	const className = [
		"h-full min-w-0",
		SURFACE_CLASS[surface],
		navigate ? `${CLICKABLE_CLASS} ${SURFACE_HOVER_CLASS[surface]}` : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={spanClass} data-repeater-item={index}>
			<div
				className={className}
				style={{ padding }}
				{...(navigate ? { role: "link", tabIndex: 0, onClick, onKeyDown } : {})}
			>
				<RowScopeProvider row={item} index={index}>
					{children}
				</RowScopeProvider>
			</div>
		</div>
	);
}

/**
 * Read-only repeater — see `RepeaterElement` for the contract. Loads an array
 * from its own `api` or reads one already in scope (`items`), and renders
 * `itemContainer` once per item with that item in scope for `type:"row"`
 * bindings. Needs the engine providers (query client, router).
 */
export const Repeater = ({
	name,
	title,
	idKey = "id",
	api,
	items,
	itemContainer,
	itemSpan,
	gap = "4",
	itemSurface = "none",
	itemPadding,
	itemNavigate,
	emptyText = "No items",
	renderBins,
}: RepeaterProps) => {
	// The own read (`api`): resolved, held and refetched by the shared hook.
	const { data, isLoading, error, held } = useReadApi(name, api);

	const scoped = useDataValue(api ? undefined : items);
	// Items from a page load in `skeleton` mode: ghost cards until it lands.
	const boundPending = useSkeleton(api ? undefined : items);
	const list: unknown[] = api ? (Array.isArray(data) ? (data as unknown[]) : []) : Array.isArray(scoped) ? scoped : [];

	const span = { sm: "12", md: "12", lg: "12", xl: "12", ...itemSpan };
	// Below `sm` no span class applies: the base `xs-col-span-12` stacks items
	// full width (a `col-span-12` utility would out-cascade the responsive rules).
	const spanClass = `xs-col-span-12 sm-col-span-${span.sm} md-col-span-${span.md} lg-col-span-${span.lg} xl-col-span-${span.xl}`;
	const padding = resolveContainerGap(itemPadding ?? (itemSurface === "none" ? "0" : "4"));

	const pending = !!api && (isLoading || held);
	const isEmpty = !pending && !boundPending && !error && list.length === 0;

	return (
		<div className="flex w-full flex-col gap-3" data-repeater={name}>
			{title && <h3 className="text-sm font-semibold text-[var(--gray-12)]">{title}</h3>}

			{boundPending && list.length === 0 && (
				<div className="grid grid-cols-12" style={{ gap: resolveContainerGap(gap) }} aria-hidden>
					{[0, 1, 2].map((i) => (
						<div key={i} className={spanClass}>
							<SkeletonBlock height={96} radius={8} />
						</div>
					))}
				</div>
			)}

			{list.length > 0 && (
				<div className="grid grid-cols-12" style={{ gap: resolveContainerGap(gap) }}>
					{list.map((item, index) => {
						const id = item && typeof item === "object" ? (item as Record<string, unknown>)[idKey] : undefined;
						return (
							<RepeaterItem
								key={id != null ? String(id) : `item-${index}`}
								item={item}
								index={index}
								spanClass={spanClass}
								surface={itemSurface}
								padding={padding}
								navigate={itemNavigate}
							>
								{renderBins(itemContainer, { row: item, index })}
							</RepeaterItem>
						);
					})}
				</div>
			)}

			{pending && isLoading && <p className="text-sm text-[var(--gray-a11)]">Loading…</p>}
			{!!error && (
				<p className="text-sm text-[var(--red-11)]">
					{error instanceof Error ? error.message : "Something went wrong"}
				</p>
			)}
			{isEmpty && <p className="text-sm text-[var(--gray-a11)]">{emptyText}</p>}
		</div>
	);
};
