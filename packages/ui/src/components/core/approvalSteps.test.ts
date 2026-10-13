import { describe, expect, test } from "bun:test";
import type { ApprovalLineKeys, ApprovalRoleRule, ApprovalStep } from "../@types";
import { initialsOf, normalizeApprovalStep, normalizeApprovalSteps, readKey } from "./approvalSteps";

const keys: ApprovalLineKeys = {
  name: ["ApproverUser.FullNameEN", "ReviewerUser.FullNameEN"],
  jobTitle: ["ApproverUser.JobTitle", "ReviewerUser.JobTitle"],
  personId: ["ApproverUser.PersonId", "ReviewerUser.PersonId"],
  status: "Status",
  remark: "Remark",
  date: "Model.UpdatedAt",
  sequence: "Sequence",
};
const roleRules: ApprovalRoleRule[] = [
  { path: "ReviewerUser", role: "Reviewer" },
  { path: "ApproverUser", sequence: 1, role: "Acknowledge" },
  { path: "ApproverUser", role: "Approver" },
];
const reviewer = { ReviewerUser: { FullNameEN: "Chutima Pimthong", JobTitle: "Manager", PersonId: "170" }, Status: "5", Remark: "", Model: { UpdatedAt: "2026-01-05" } };
const approver = (name: string, seq: number, status: string) => ({
  ApproverUser: { FullNameEN: name, PersonId: String(seq) },
  Sequence: seq,
  Status: status,
  Remark: "",
});
const rows = [reviewer, approver("Sasikan Sonchun", 1, "5"), approver("Pitak Wuttinonchai", 2, "5"), approver("Taksawan Sabsirin", 3, "2")];

describe("readKey — fallback paths", () => {
  test("tries each path in order", () => {
    expect(readKey(reviewer, keys.name)).toBe("Chutima Pimthong");
    expect(readKey(approver("A", 1, "5"), keys.name)).toBe("A");
  });
  test("empty strings don't count as found", () => {
    expect(readKey({ a: "", b: "x" }, ["a", "b"])).toBe("x");
  });
});

describe("normalizeApprovalStep", () => {
  test("maps the user's status codes, labels and role rules", () => {
    const s = normalizeApprovalStep(reviewer, { keys, roleRules });
    expect(s).toMatchObject({ name: "Chutima Pimthong", role: "Reviewer", state: "done", status: "5", statusLabel: "Approved", jobTitle: "Manager", date: "2026-01-05" });
    expect(s.remark).toBeUndefined();
    expect(normalizeApprovalStep(approver("S", 1, "5"), { keys, roleRules }).role).toBe("Acknowledge");
    expect(normalizeApprovalStep(approver("P", 2, "2"), { keys, roleRules })).toMatchObject({ role: "Approver", state: "current", statusLabel: "Approving" });
    expect(normalizeApprovalStep(approver("P", 2, "3"), { keys, roleRules }).state).toBe("rejected");
    expect(normalizeApprovalStep(approver("P", 2, "99"), { keys, roleRules }).state).toBe("pending");
  });
  test("a role key on the row wins over the rules", () => {
    expect(normalizeApprovalStep({ ...reviewer, Role: "Checker" }, { keys: { ...keys, role: "Role" }, roleRules }).role).toBe("Checker");
  });
  test("a custom status map replaces the default", () => {
    expect(normalizeApprovalStep(reviewer, { keys, statusMap: { "5": "skipped" } }).state).toBe("skipped");
  });
  test("avatarUrl renders over the normalized step; an unresolved template is no URL", () => {
    expect(normalizeApprovalStep(reviewer, { keys, avatarUrl: "/photo/{{personId}}" }).avatar).toBe("/photo/170");
    expect(normalizeApprovalStep({ Status: "5" }, { keys, avatarUrl: "/photo/{{personId}}" }).avatar).toBeUndefined();
    expect(normalizeApprovalStep({ ...reviewer, Pic: "/x.png" }, { keys: { ...keys, avatar: "Pic" }, avatarUrl: "/photo/{{personId}}" }).avatar).toBe("/x.png");
  });
});

describe("normalizeApprovalSteps", () => {
  const requester: ApprovalStep = { name: "Dev Test3", role: "Requester", state: "done" };
  test("prepends the requester and keeps the explicit current", () => {
    const steps = normalizeApprovalSteps(rows, { keys, roleRules }, requester);
    expect(steps.map((s) => `${s.name}:${s.role}:${s.state}`)).toEqual([
      "Dev Test3:Requester:done",
      "Chutima Pimthong:Reviewer:done",
      "Sasikan Sonchun:Acknowledge:done",
      "Pitak Wuttinonchai:Approver:done",
      "Taksawan Sabsirin:Approver:current",
    ]);
  });
  test("sorts by sequence, rows without one first in their order", () => {
    const shuffled = [rows[3], rows[1], rows[0], rows[2]];
    expect(normalizeApprovalSteps(shuffled, { keys }).map((s) => s.name)).toEqual([
      "Chutima Pimthong", "Sasikan Sonchun", "Pitak Wuttinonchai", "Taksawan Sabsirin",
    ]);
  });
  test("promotes the first pending after the last done to current when none is", () => {
    const all0 = [approver("A", 1, "5"), approver("B", 2, "0"), approver("C", 3, "0")];
    expect(normalizeApprovalSteps(all0, { keys }).map((s) => s.state)).toEqual(["done", "current", "pending"]);
  });
  test("a rejected line promotes nothing", () => {
    const r = [approver("A", 1, "5"), approver("B", 2, "3"), approver("C", 3, "0")];
    expect(normalizeApprovalSteps(r, { keys }).map((s) => s.state)).toEqual(["done", "rejected", "pending"]);
  });
  test("non-array input is an empty line", () => {
    expect(normalizeApprovalSteps(undefined, { keys })).toEqual([]);
    expect(normalizeApprovalSteps(undefined, { keys }, requester)).toHaveLength(1);
  });
});

describe("initialsOf", () => {
  test("first and last initial", () => {
    expect(initialsOf("Chutima Pimthong")).toBe("CP");
    expect(initialsOf("Dev Test3")).toBe("DT");
    expect(initialsOf("Cher")).toBe("CH");
    expect(initialsOf("")).toBe("?");
  });
});
