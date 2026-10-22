import type { JSX } from "react";
import type { CustomComponentProps } from "@gummy-ui/ui";

/** Throws on render: the engine's per-component boundary turns it into an error placeholder. */
export function Broken({ props }: CustomComponentProps<{ message?: string }>): JSX.Element {
  throw new Error(props.message ?? "Broken on purpose");
}
