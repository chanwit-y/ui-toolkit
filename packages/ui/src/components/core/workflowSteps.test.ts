import { describe, expect, test } from "bun:test";
import type { WorkflowRole } from "../@types";
import {
  assignedUserIds,
  DEFAULT_STEP_KEYS as K,
  insertAllowed,
  insertStep,
  placeFor,
  removeStep,
  replaceStep,
  roleAvailable,
  stepsFromValue,
} from "./workflowSteps";

const roles: WorkflowRole[] = [
  { value: "inputter", label: "Inputter", max: 1, position: "first" },
  { value: "approver", label: "Approver" },
  { value: "acknowledger", label: "Acknowledger" },
];
const u = (id: string, name = id) => ({ PersonId: id, FullNameEN: name });
const userKeys = { id: "PersonId", display: "FullNameEN" };
const step = (role: string, seq: number, users: unknown[] = [], extra = {}) => ({ actionType: role, sequence: seq, inchargeUsers: users, ccUsers: [], ...extra });
const line = [step("inputter", 1, [u("1")]), step("approver", 2, [u("2")]), step("acknowledger", 3, [u("3")])];

describe("stepsFromValue", () => {
  test("sorts by sequence, keeps extra fields, ignores non-arrays", () => {
    const out = stepsFromValue([step("b", 2, [], { id: 9 }), step("a", 1)], K);
    expect(out.map((s) => s.actionType)).toEqual(["a", "b"]);
    expect(out[1].id).toBe(9);
    expect(stepsFromValue(undefined, K)).toEqual([]);
  });
});

describe("insert / replace / remove renumber 1-based", () => {
  test("insert between", () => {
    const out = insertStep(line, 1, step("approver", 99), K);
    expect(out.map((s) => `${s.actionType}:${s.sequence}`)).toEqual(["inputter:1", "approver:2", "approver:3", "acknowledger:4"]);
  });
  test("replace merges over the old step (extra fields survive)", () => {
    const withId = [{ ...line[1], Id: 97 }];
    expect(replaceStep(withId, 0, { actionType: "acknowledger" }, K)[0]).toMatchObject({ Id: 97, actionType: "acknowledger", sequence: 1 });
  });
  test("remove", () => {
    expect(removeStep(line, 0, K).map((s) => s.sequence)).toEqual([1, 2]);
  });
});

describe("role rules", () => {
  test("max counts the other steps, not the one being edited", () => {
    expect(roleAvailable(roles[0], line, K)).toBe(false);
    expect(roleAvailable(roles[0], line, K, 0)).toBe(true);
    expect(roleAvailable(roles[1], line, K)).toBe(true);
  });
  test("insertAllowed respects a first-pinned role", () => {
    expect(insertAllowed(0, line, roles, K)).toBe(false);
    expect(insertAllowed(1, line, roles, K)).toBe(true);
    expect(insertAllowed(3, line, roles, K)).toBe(true);
    expect(insertAllowed(0, [], roles, K)).toBe(true);
  });
  test("placeFor pins first / last and otherwise keeps the wanted index past the pinned head", () => {
    expect(placeFor(roles[0], 2, line.slice(1), roles, K)).toBe(0);
    expect(placeFor(roles[1], 0, line, roles, K)).toBe(1);
    expect(placeFor({ value: "x", label: "x", position: "last" }, 0, line, roles, K)).toBe(3);
  });
  test("assignedUserIds excludes the edited step", () => {
    expect([...assignedUserIds(line, K, userKeys)]).toEqual(["1", "2", "3"]);
    expect([...assignedUserIds(line, K, userKeys, 1)]).toEqual(["1", "3"]);
  });
});
