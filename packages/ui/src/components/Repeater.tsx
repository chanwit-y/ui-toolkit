import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { NavigateTarget, RepeaterProps } from "./@types";
import { resolveContainerGap } from "./core/containerGrid";
import { drillPaths, resolveDataValues, type DataValueScope } from "./core/dataValue";
import { useNavigateTo } from "./core/pages";
import { callArgs, stateKeys, useStateVersion } from "./core/readApi";
import { RowScopeProvider, useDataValue, useRowScope } from "./core/rowScope";
import { useStord } from "./core/stord";

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
	const params = useParams();
	const [searchParams] = useSearchParams();
	const parent = useRowScope();
	const updateFnCtxs = useStord((state) => state.updateFnCtxs);

	const scope = useMemo<DataValueScope>(
		() => ({ params, searchParams, row: parent?.row }),
		[params, searchParams, parent],
	);
	const stateVersion = useStateVersion(stateKeys(api?.params, api?.query, api?.body));

	// Resolve the read config now; the query key carries the result so a route
	// change (or a state slice arriving) refetches with the new values.
	const readArgs = useMemo(() => {
		if (!api) return { args: [] as unknown[], ready: false };
		const q = resolveDataValues(api.query, scope);
		const p = resolveDataValues(api.params, scope);
		const b = resolveDataValues(api.body, scope);
		const ready = (api.urlParams ?? []).every((k) => p[k] !== undefined && p[k] !== "");
		return { args: callArgs(api.segments, q, p, api.segments?.body || api.body ? b : undefined), ready };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [api, scope, stateVersion]);

	const { data, refetch, isLoading, error } = useQuery({
		queryKey: [`repeater-${name}`, readArgs.args],
		queryFn: async () => {
			const res = await (api!.api as (...a: unknown[]) => Promise<unknown>)(...readArgs.args);
			const rows = drillPaths(res, api!.paths);
			return Array.isArray(rows) ? (rows as unknown[]) : [];
		},
		enabled: !!api && readArgs.ready,
	});

	useEffect(() => {
		if (api) updateFnCtxs(name, refetch);
	}, [api, name, updateFnCtxs, refetch]);

	const scoped = useDataValue(api ? undefined : items);
	const list: unknown[] = api ? data ?? [] : Array.isArray(scoped) ? scoped : [];

	const span = { sm: "12", md: "12", lg: "12", xl: "12", ...itemSpan };
	// Below `sm` no span class applies: the base `xs-col-span-12` stacks items
	// full width (a `col-span-12` utility would out-cascade the responsive rules).
	const spanClass = `xs-col-span-12 sm-col-span-${span.sm} md-col-span-${span.md} lg-col-span-${span.lg} xl-col-span-${span.xl}`;
	const padding = resolveContainerGap(itemPadding ?? (itemSurface === "none" ? "0" : "4"));

	const pending = !!api && (isLoading || !readArgs.ready);
	const isEmpty = !pending && !error && list.length === 0;

	return (
		<div className="flex w-full flex-col gap-3" data-repeater={name}>
			{title && <h3 className="text-sm font-semibold text-[var(--gray-12)]">{title}</h3>}

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
