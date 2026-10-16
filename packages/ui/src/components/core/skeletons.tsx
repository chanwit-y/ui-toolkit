import type { ReactNode } from "react";
import type { Bin, DataValue } from "../@types";
import { Skeleton, SkeletonBlock } from "../Skeleton";
import { skeletonBindingKeys } from "./stateStore";

/**
 * Bin types that draw their own skeleton from their own bindings (`items`,
 * `srcValue`, `titleValue`, …) or render nothing: the grid cell leaves them
 * alone. Everything else with a `value: { type: "state" }` — the form fields
 * — is covered generically by the cell.
 */
const SELF_SKELETON = new Set<Bin["type"]>(["text", "typography", "html", "custom", "hidden", "avatar", "card", "repeater", "datatable", "approvalline"]);

/** The state binding a bin's cell should skeleton on, if any. */
export function binSkeletonValue(bin: Bin): DataValue | undefined {
  if (SELF_SKELETON.has(bin.type)) return undefined;
  const v = (bin.element as { value?: DataValue } | undefined)?.value;
  return v && typeof v === "object" && skeletonBindingKeys([v]).length ? v : undefined;
}

/**
 * The placeholder for a bin whose bound slice is still loading: the rendered
 * element itself under the shimmer (so a text field, a radio group or a
 * select keeps its exact size), except where the empty element says nothing
 * about the loaded shape — a workflow editor's line is a few ghost cards.
 */
export function binSkeleton(bin: Bin, rendered: ReactNode): ReactNode {
  if (bin.type === "workfloweditor") {
    return (
      <div className="flex flex-col gap-3" aria-hidden>
        <SkeletonBlock height={14} width="30%" />
        {[0, 1, 2].map((i) => (
          <SkeletonBlock key={i} height={56} radius={8} />
        ))}
      </div>
    );
  }
  return <Skeleton>{rendered}</Skeleton>;
}
