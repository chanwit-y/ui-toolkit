import type { CSSProperties } from "react";
import type { Bin, Container } from "../@types";

export const DEFAULT_CONTAINER_GRID = {
	gap: "2",
	justifyItems: "stretch",
	alignItems: "stretch",
	justifyContent: "start",
	alignContent: "start",
	gridAutoFlow: "row",
} as const satisfies Pick<
	Container,
	"gap" | "justifyItems" | "alignItems" | "justifyContent" | "alignContent" | "gridAutoFlow"
>;

/** Tailwind spacing scale → CSS length for grid gap */
const GAP_SCALE_REM: Record<string, string> = {
	"0": "0",
	"1": "0.25rem",
	"2": "0.5rem",
	"3": "0.75rem",
	"4": "1rem",
	"5": "1.25rem",
	"6": "1.5rem",
	"8": "2rem",
	"10": "2.5rem",
	"12": "3rem",
};

export function resolveContainerGap(gap: Container["gap"] = DEFAULT_CONTAINER_GRID.gap): string {
	if (gap === undefined || gap === null) {
		return GAP_SCALE_REM[DEFAULT_CONTAINER_GRID.gap];
	}
	if (typeof gap === "number") {
		return `${gap}px`;
	}
	const trimmed = gap.trim();
	if (/^\d+(\.\d+)?$/.test(trimmed)) {
		return GAP_SCALE_REM[trimmed] ?? `${Number(trimmed) * 0.25}rem`;
	}
	return trimmed;
}

export function getContainerGridStyle(container: Container): CSSProperties {
	const gap = container.gap ?? DEFAULT_CONTAINER_GRID.gap;
	const justifyItems = container.justifyItems ?? DEFAULT_CONTAINER_GRID.justifyItems;
	const alignItems = container.alignItems ?? DEFAULT_CONTAINER_GRID.alignItems;
	const justifyContent = container.justifyContent ?? DEFAULT_CONTAINER_GRID.justifyContent;
	const alignContent = container.alignContent ?? DEFAULT_CONTAINER_GRID.alignContent;
	const gridAutoFlow = container.gridAutoFlow ?? DEFAULT_CONTAINER_GRID.gridAutoFlow;

	return {
		gap: resolveContainerGap(gap),
		justifyItems,
		alignItems,
		alignContent,
		justifyContent,
		gridAutoFlow,
	};
}

export function getBinGridItemStyle(bin: Bin): CSSProperties | undefined {
	const { justifySelf, alignSelf } = bin;
	if (justifySelf === undefined && alignSelf === undefined) {
		return undefined;
	}
	return {
		...(justifySelf !== undefined && { justifySelf }),
		...(alignSelf !== undefined && { alignSelf }),
	};
}
