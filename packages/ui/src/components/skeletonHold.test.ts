import { describe, expect, test } from "bun:test"
import { MAX_SKELETON_HOLD, skeletonHold } from "./Skeleton"

describe("skeletonHold", () => {
	test("rounds and clamps a delay", () => {
		expect(skeletonHold(1500)).toBe(1500)
		expect(skeletonHold(249.6)).toBe(250)
		expect(skeletonHold(-5)).toBe(0)
		expect(skeletonHold(99_999)).toBe(MAX_SKELETON_HOLD)
	})
	test("anything else is no hold", () => {
		expect(skeletonHold(undefined)).toBe(0)
		expect(skeletonHold("2000")).toBe(0)
		expect(skeletonHold(NaN)).toBe(0)
	})
})
