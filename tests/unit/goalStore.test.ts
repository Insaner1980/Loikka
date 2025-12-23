import { describe, it, expect } from "vitest";
import { useGoalStore } from "../../src/stores/useGoalStore";
import { getDisciplineById } from "../../src/data/disciplines";
import type { Goal } from "../../src/types";

describe("useGoalStore.calculateProgress", () => {
  const calculateProgress = useGoalStore.getState().calculateProgress;

  // Helper to create a goal with specific discipline
  const createGoal = (disciplineId: number, targetValue: number): Goal => ({
    id: 1,
    athleteId: 1,
    disciplineId,
    targetValue,
    targetDate: null,
    status: "active",
    achievedAt: null,
    createdAt: "2025-01-01",
  });

  describe("lower-is-better disciplines (sprints)", () => {
    // 100m sprint (id=3, lowerIsBetter=true)
    const sprintGoal = createGoal(3, 12.0); // Target: 12.00s

    it("returns 0 when no current result", () => {
      expect(calculateProgress(sprintGoal, null)).toBe(0);
    });

    it("returns 100 when target is achieved", () => {
      // Current: 11.90s, Target: 12.00s → achieved
      expect(calculateProgress(sprintGoal, 11.9)).toBe(100);
    });

    it("returns 100 when target is exactly met", () => {
      expect(calculateProgress(sprintGoal, 12.0)).toBe(100);
    });

    it("returns partial progress when improving", () => {
      // Target: 12.0s, estimated start: 12.0 * 1.2 = 14.4s
      // Current: 13.2s (halfway from 14.4 to 12.0)
      const progress = calculateProgress(sprintGoal, 13.2);
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(100);
      // 14.4 - 12.0 = 2.4 total improvement needed
      // 14.4 - 13.2 = 1.2 achieved improvement
      // 1.2 / 2.4 = 50%
      expect(progress).toBeCloseTo(50, 0);
    });

    it("returns low progress for results far from target", () => {
      // Current: 14.0s, Target: 12.0s
      const progress = calculateProgress(sprintGoal, 14.0);
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(50);
    });

    it("returns 0 for results worse than estimated start", () => {
      // Estimated start: 12.0 * 1.2 = 14.4s
      // Current: 15.0s (worse than estimated start)
      const progress = calculateProgress(sprintGoal, 15.0);
      expect(progress).toBe(0);
    });
  });

  describe("higher-is-better disciplines (jumps)", () => {
    // Long jump (id=17, lowerIsBetter=false)
    const jumpGoal = createGoal(17, 5.0); // Target: 5.00m

    it("returns 0 when no current result", () => {
      expect(calculateProgress(jumpGoal, null)).toBe(0);
    });

    it("returns 100 when target is achieved", () => {
      // Current: 5.10m, Target: 5.00m → achieved
      expect(calculateProgress(jumpGoal, 5.1)).toBe(100);
    });

    it("returns 100 when target is exactly met", () => {
      expect(calculateProgress(jumpGoal, 5.0)).toBe(100);
    });

    it("returns proportional progress", () => {
      // Current: 4.0m, Target: 5.0m
      // Progress = 4.0 / 5.0 = 80%
      expect(calculateProgress(jumpGoal, 4.0)).toBeCloseTo(80, 0);
    });

    it("returns 50% progress at halfway point", () => {
      // Current: 2.5m, Target: 5.0m
      expect(calculateProgress(jumpGoal, 2.5)).toBeCloseTo(50, 0);
    });

    it("returns small progress for small results", () => {
      // Current: 1.0m, Target: 5.0m
      expect(calculateProgress(jumpGoal, 1.0)).toBeCloseTo(20, 0);
    });
  });

  describe("throws disciplines", () => {
    // Shot put (id=21, lowerIsBetter=false)
    const throwGoal = createGoal(21, 10.0); // Target: 10.00m

    it("calculates progress correctly for throws", () => {
      // Current: 8.0m, Target: 10.0m
      expect(calculateProgress(throwGoal, 8.0)).toBeCloseTo(80, 0);
    });

    it("returns 100 when exceeded", () => {
      expect(calculateProgress(throwGoal, 12.0)).toBe(100);
    });
  });

  describe("edge cases", () => {
    it("handles invalid discipline ID", () => {
      const invalidGoal = createGoal(999, 10.0);
      expect(calculateProgress(invalidGoal, 5.0)).toBe(0);
    });

    it("handles zero target value", () => {
      const zeroTargetGoal = createGoal(17, 0);
      // With target 0, currentBest / 0 would be Infinity, but should be clamped
      const progress = calculateProgress(zeroTargetGoal, 5.0);
      expect(progress).toBe(100); // Any result >= 0 should be 100%
    });

    it("handles negative current best (unlikely but possible)", () => {
      const jumpGoal = createGoal(17, 5.0);
      const progress = calculateProgress(jumpGoal, -1.0);
      // -1.0 / 5.0 = -20%, but should be clamped to 0
      expect(progress).toBe(0);
    });
  });

  describe("hurdles disciplines", () => {
    // 60m hurdles (id=12, lowerIsBetter=true)
    const hurdleGoal = createGoal(12, 10.0); // Target: 10.00s

    it("calculates progress correctly for hurdles", () => {
      // Target: 10.0s, estimated start: 12.0s
      // Current: 11.0s, achieved: 1.0s of 2.0s total = 50%
      const progress = calculateProgress(hurdleGoal, 11.0);
      expect(progress).toBeCloseTo(50, 0);
    });
  });
});

describe("getDisciplineById", () => {
  it("returns correct discipline for sprint", () => {
    const discipline = getDisciplineById(3); // 100m
    expect(discipline).toBeDefined();
    expect(discipline?.name).toBe("100m");
    expect(discipline?.lowerIsBetter).toBe(true);
  });

  it("returns correct discipline for jump", () => {
    const discipline = getDisciplineById(17); // Pituus
    expect(discipline).toBeDefined();
    expect(discipline?.name).toBe("Pituus");
    expect(discipline?.lowerIsBetter).toBe(false);
  });

  it("returns undefined for invalid ID", () => {
    const discipline = getDisciplineById(999);
    expect(discipline).toBeUndefined();
  });
});
