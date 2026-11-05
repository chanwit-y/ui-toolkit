import { describe, expect, test } from "bun:test";
import { groupOptions, matchesOptionQuery, resolveItemGroup } from "./OptionRow";

type Team = { id: string; name: string; dept?: string | null };
const teams: Team[] = [
	{ id: "1", name: "Operation Admin", dept: "General Administration" },
	{ id: "2", name: "Payroll", dept: "Human Resources" },
	{ id: "3", name: "Logistics", dept: "General Administration" },
	{ id: "4", name: "Unassigned" },
	{ id: "5", name: "Blank", dept: "  " },
];

describe("groupOptions", () => {
	test("no group key: one headerless section in the given order", () => {
		expect(groupOptions(teams)).toEqual([{ group: null, items: teams }]);
	});

	test("ungrouped first, then groups in first-seen order; blank is ungrouped", () => {
		const out = groupOptions(teams, "dept");
		expect(out.map((g) => g.group)).toEqual([null, "General Administration", "Human Resources"]);
		expect(out[0].items.map((t) => t.id)).toEqual(["4", "5"]);
		expect(out[1].items.map((t) => t.id)).toEqual(["1", "3"]);
		expect(out[2].items.map((t) => t.id)).toEqual(["2"]);
	});

	test("a function group", () => {
		const out = groupOptions(teams, (t) => (t.dept ?? "").slice(0, 1));
		expect(out.map((g) => g.group)).toEqual([null, "G", "H"]);
	});

	test("resolveItemGroup trims and nulls blanks", () => {
		expect(resolveItemGroup(teams[4], "dept")).toBeNull();
		expect(resolveItemGroup(teams[3], "dept")).toBeNull();
		expect(resolveItemGroup(teams[0], "dept")).toBe("General Administration");
		expect(resolveItemGroup(teams[0])).toBeNull();
	});
});

describe("matchesOptionQuery with a group", () => {
	test("a query matching the group label keeps every row of the group", () => {
		const hits = teams.filter((t) => matchesOptionQuery(t, "human", "name", undefined, "dept"));
		expect(hits.map((t) => t.id)).toEqual(["2"]);
		const admin = teams.filter((t) => matchesOptionQuery(t, "admin", "name", undefined, "dept"));
		expect(admin.map((t) => t.id)).toEqual(["1", "3"]);
	});

	test("without a group key the label is not searched", () => {
		expect(teams.filter((t) => matchesOptionQuery(t, "human", "name")).length).toBe(0);
	});
});
