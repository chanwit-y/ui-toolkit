import { describe, expect, test } from "bun:test";
import { failureMessage, filesFromDataTransfer, hasFiles, partitionDrop, rejectionMessage, runWithConcurrency, uploadFormData, uploadSubject } from "./fileCollectionUpload";

const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });

describe("partitionDrop", () => {
	test("no rules: every non-empty file lands, in order", () => {
		const files = [file("a.png", "image/png"), file("b.pdf", "application/pdf")];
		const r = partitionDrop(files, {});
		expect(r.accepted.map((f) => f.name)).toEqual(["a.png", "b.pdf"]);
		expect(r.rejected).toEqual([]);
	});
	test("accept, size, count and empty each skip with their reason; the rest lands", () => {
		const files = [file("a.png", "image/png"), file("b.exe", "application/octet-stream"), file("big.png", "image/png", 3 * 1024 * 1024), file("c.jpg", "image/jpeg"), file("d.png", "image/png"), file("z.png", "image/png", 0)];
		const r = partitionDrop(files, { accept: ["image"], maxSizeMB: 2, maxFiles: 2 });
		expect(r.accepted.map((f) => f.name)).toEqual(["a.png", "c.jpg"]);
		expect(r.rejected.map((x) => [x.file.name, x.reason])).toEqual([
			["b.exe", "type"],
			["big.png", "size"],
			["d.png", "count"],
			["z.png", "empty"],
		]);
	});
	test("OS folders are listed first as rejected", () => {
		const r = partitionDrop([file("a.txt", "text/plain")], {}, [file("Photos", "", 0)]);
		expect(r.rejected).toEqual([{ file: expect.any(File), reason: "folder" }]);
		expect(r.accepted).toHaveLength(1);
	});
});

describe("uploadFormData / uploadSubject", () => {
	test("fixed fields; parentId omitted at the root; extras as strings", () => {
		const f = file("Q1 sales.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
		const root = uploadFormData(f, { collectionId: "c1", parentId: null }, { projectId: 7, note: "x", skip: undefined });
		expect(root.get("file")).toBeInstanceOf(File);
		expect(root.get("collectionId")).toBe("c1");
		expect(root.has("parentId")).toBe(false);
		expect(root.get("name")).toBe("Q1 sales.xlsx");
		expect(root.get("kind")).toBe("spreadsheet");
		expect(root.get("projectId")).toBe("7");
		expect(root.get("note")).toBe("x");
		expect(root.has("skip")).toBe(false);
		const nested = uploadFormData(f, { collectionId: "c1", parentId: "n2" });
		expect(nested.get("parentId")).toBe("n2");
		expect(uploadSubject(f, { collectionId: "c1", parentId: "n2" })).toEqual({ collectionId: "c1", parentId: "n2", id: "n2", name: "Q1 sales.xlsx", kind: "spreadsheet" });
	});
});

describe("messages", () => {
	test("one and many", () => {
		const a = { file: file("a.exe", "x/y"), reason: "type" as const };
		const b = { file: file("b.png", "image/png"), reason: "size" as const };
		expect(rejectionMessage([a], { maxSizeMB: 5 })).toBe('"a.exe" was skipped: file type not allowed');
		expect(rejectionMessage([a, b], { maxSizeMB: 5 })).toBe("2 files skipped: a.exe (file type not allowed), b.png (over 5 MB)");
		expect(failureMessage([{ name: "a.png", error: new Error("413") }])).toBe('"a.png" failed: 413');
		expect(failureMessage([{ name: "a.png", error: new Error("413") }, { name: "b.png", error: "?" }])).toBe("2 files failed: a.png (413), b.png (upload failed)");
	});
});

describe("hasFiles / filesFromDataTransfer", () => {
	test("reads the Files type and falls back to dt.files", () => {
		expect(hasFiles(null)).toBe(false);
		expect(hasFiles({ types: ["text/plain"] } as unknown as DataTransfer)).toBe(false);
		expect(hasFiles({ types: ["Files"] } as unknown as DataTransfer)).toBe(true);
		const f = file("a.txt", "text/plain");
		const plain = filesFromDataTransfer({ files: [f] } as unknown as DataTransfer);
		expect(plain.files).toEqual([f]);
		const withEntries = filesFromDataTransfer({
			items: [
				{ kind: "file", getAsFile: () => f, webkitGetAsEntry: () => ({ isDirectory: false }) },
				{ kind: "file", getAsFile: () => file("Photos", "", 0), webkitGetAsEntry: () => ({ isDirectory: true }) },
				{ kind: "string", getAsFile: () => null },
			],
			files: [],
		} as unknown as DataTransfer);
		expect(withEntries.files.map((x) => x.name)).toEqual(["a.txt"]);
		expect(withEntries.folders.map((x) => x.name)).toEqual(["Photos"]);
	});
});

describe("runWithConcurrency", () => {
	test("never runs more than the limit at once, keeps order, settles failures", async () => {
		let running = 0;
		let peak = 0;
		const task = (n: number, fail = false) => async () => {
			running++;
			peak = Math.max(peak, running);
			await new Promise((r) => setTimeout(r, 5));
			running--;
			if (fail) throw new Error(`no ${n}`);
			return n;
		};
		const results = await runWithConcurrency([task(1), task(2, true), task(3), task(4), task(5)], 2);
		expect(peak).toBe(2);
		expect(results.map((r) => (r.status === "fulfilled" ? r.value : (r.reason as Error).message))).toEqual([1, "no 2", 3, 4, 5]);
		expect(await runWithConcurrency([], 3)).toEqual([]);
	});
});
