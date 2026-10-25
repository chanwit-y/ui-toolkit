import { describe, expect, test } from "bun:test";
import { createFormControl } from "react-hook-form";
import { followFormField } from "./observedField";

/** A form outside React, as an edit modal's form is to its fields. */
function form(defaultValues: Record<string, unknown>) {
  const { control: _control, ...methods } = createFormControl({ defaultValues });
  return methods;
}

describe("followFormField — a dependent select's parent", () => {
  test("a prefilled parent is reported at once", () => {
    const seen: unknown[] = [];
    followFormField(form({ clusterId: "c1", teamId: "t9" }), "clusterId", (v) => seen.push(v));
    expect(seen).toEqual(["c1"]);
  });

  test("a reset (the modal opening on another row) and a change are reported", () => {
    const f = form({});
    const seen: unknown[] = [];
    followFormField(f, "clusterId", (v) => seen.push(v));
    f.reset({ clusterId: "c2", teamId: "t1" });
    f.setValue("clusterId", "c3");
    expect(seen).toEqual([undefined, "c2", "c3"]);
  });

  test("other fields are ignored, and unsubscribing stops it", () => {
    const f = form({ clusterId: "c1" });
    const seen: unknown[] = [];
    const stop = followFormField(f, "clusterId", (v) => seen.push(v));
    f.setValue("teamId", "t1");
    stop();
    f.setValue("clusterId", "c4");
    expect(seen).toEqual(["c1"]);
  });

  test("no form or no name is a no-op", () => {
    const seen: unknown[] = [];
    followFormField(null, "clusterId", (v) => seen.push(v))();
    followFormField(form({ clusterId: "c1" }), undefined, (v) => seen.push(v))();
    expect(seen).toEqual([]);
  });
});
