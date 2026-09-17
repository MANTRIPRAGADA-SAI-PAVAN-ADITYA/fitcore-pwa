import { describe, expect, it } from "vitest";
import {
  averageByDay,
  bmiCategory,
  calcBMI,
  changeBetween,
  currentStreak,
  estimatedWeeklyRate,
  isCalorieTargetVeryLow,
  latestOnOrBefore,
  percentChange,
  progressPercent,
  rollingAverage,
  sumNutrition,
  valueDaysAgo,
} from "./calculations";

describe("calcBMI", () => {
  it("computes BMI from weight and height", () => {
    expect(calcBMI(70, 175)).toBeCloseTo(22.86, 1);
  });

  it("returns null for non-positive inputs", () => {
    expect(calcBMI(0, 175)).toBeNull();
    expect(calcBMI(70, 0)).toBeNull();
    expect(calcBMI(-5, 175)).toBeNull();
  });
});

describe("bmiCategory", () => {
  it("labels ranges without diagnosing", () => {
    expect(bmiCategory(17)).toBe("Below typical range");
    expect(bmiCategory(22)).toBe("Typical range");
    expect(bmiCategory(27)).toBe("Above typical range");
    expect(bmiCategory(32)).toBe("Well above typical range");
  });
});

describe("changeBetween / percentChange", () => {
  it("computes signed change", () => {
    expect(changeBetween(100, 95)).toBe(-5);
    expect(changeBetween(95, 100)).toBe(5);
  });

  it("computes percent change and guards divide-by-zero", () => {
    expect(percentChange(100, 90)).toBeCloseTo(-10);
    expect(percentChange(0, 90)).toBeNull();
  });
});

describe("progressPercent", () => {
  it("computes progress toward a lower target", () => {
    expect(progressPercent(100, 90, 80)).toBe(50);
    expect(progressPercent(100, 80, 80)).toBe(100);
    expect(progressPercent(100, 100, 80)).toBe(0);
  });

  it("clamps overshoot to 100 and undershoot to 0", () => {
    expect(progressPercent(100, 60, 80)).toBe(100);
    expect(progressPercent(100, 110, 80)).toBe(0);
  });

  it("handles a start-equals-target goal without dividing by zero", () => {
    expect(progressPercent(80, 80, 80)).toBe(100);
  });
});

describe("averageByDay", () => {
  it("averages multiple same-day entries", () => {
    const result = averageByDay([
      { date: "2024-01-01", value: 80 },
      { date: "2024-01-01", value: 82 },
      { date: "2024-01-02", value: 79 },
    ]);
    expect(result).toEqual(
      expect.arrayContaining([
        { date: "2024-01-01", value: 81 },
        { date: "2024-01-02", value: 79 },
      ]),
    );
  });

  it("returns an empty array for no entries", () => {
    expect(averageByDay([])).toEqual([]);
  });
});

describe("rollingAverage", () => {
  it("returns an empty array when there is no weight history", () => {
    expect(rollingAverage([], 7)).toEqual([]);
  });

  it("computes a trailing average that only grows as data accumulates", () => {
    const entries = [
      { date: "2024-01-01", value: 100 },
      { date: "2024-01-02", value: 98 },
      { date: "2024-01-03", value: 96 },
    ];
    const result = rollingAverage(entries, 7);
    expect(result[0].value).toBe(100);
    expect(result[1].value).toBe(99); // (100+98)/2
    expect(result[2].value).toBeCloseTo(98); // (100+98+96)/3
  });

  it("collapses multiple entries on the same day before averaging", () => {
    const entries = [
      { date: "2024-01-01", value: 100 },
      { date: "2024-01-01", value: 102 }, // second weigh-in, same day
    ];
    const result = rollingAverage(entries, 7);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(101);
  });
});

describe("latestOnOrBefore / valueDaysAgo", () => {
  const entries = [
    { date: "2024-01-01", value: 100 },
    { date: "2024-01-05", value: 97 },
    { date: "2024-01-10", value: 95 },
  ];

  it("finds the latest entry", () => {
    expect(latestOnOrBefore(entries)?.value).toBe(95);
  });

  it("finds the latest entry on or before a cutoff date", () => {
    expect(latestOnOrBefore(entries, "2024-01-06")?.value).toBe(97);
  });

  it("returns null when there is nothing on or before the cutoff", () => {
    expect(latestOnOrBefore(entries, "2023-12-31")).toBeNull();
  });

  it("finds the nearest value N days before a date", () => {
    expect(valueDaysAgo(entries, "2024-01-10", 5)).toBe(97);
  });
});

describe("estimatedWeeklyRate", () => {
  it("returns null with fewer than two distinct days", () => {
    expect(estimatedWeeklyRate([])).toBeNull();
    expect(estimatedWeeklyRate([{ date: "2024-01-01", value: 80 }])).toBeNull();
  });

  it("returns null when all entries fall on the same day", () => {
    const entries = [
      { date: "2024-01-01", value: 80 },
      { date: "2024-01-01", value: 81 },
    ];
    expect(estimatedWeeklyRate(entries)).toBeNull();
  });

  it("estimates a steady weekly loss from a linear trend", () => {
    // Loses exactly 1kg every 7 days over 4 weeks.
    const entries = [
      { date: "2024-01-01", value: 100 },
      { date: "2024-01-08", value: 99 },
      { date: "2024-01-15", value: 98 },
      { date: "2024-01-22", value: 97 },
      { date: "2024-01-29", value: 96 },
    ];
    expect(estimatedWeeklyRate(entries)).toBeCloseTo(-1, 5);
  });
});

describe("sumNutrition", () => {
  it("sums macro fields across entries", () => {
    const totals = sumNutrition([
      { calories: 300, proteinG: 20, carbsG: 30, fatG: 10, fiberG: 4 },
      { calories: 500, proteinG: 40, carbsG: 50, fatG: 15, fiberG: 6 },
    ]);
    expect(totals).toEqual({ calories: 800, proteinG: 60, carbsG: 80, fatG: 25, fiberG: 10 });
  });

  it("returns all zeros for an empty list", () => {
    expect(sumNutrition([])).toEqual({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 });
  });
});

describe("currentStreak", () => {
  it("counts zero when today is not completed", () => {
    expect(currentStreak([], "2024-01-10")).toBe(0);
  });

  it("counts consecutive completed days ending today", () => {
    const dates = ["2024-01-08", "2024-01-09", "2024-01-10"];
    expect(currentStreak(dates, "2024-01-10")).toBe(3);
  });

  it("resets across a gap instead of continuing", () => {
    const dates = ["2024-01-01", "2024-01-09", "2024-01-10"];
    expect(currentStreak(dates, "2024-01-10")).toBe(2);
  });
});

describe("isCalorieTargetVeryLow", () => {
  it("flags targets below a sex-specific floor", () => {
    expect(isCalorieTargetVeryLow(1100, "female")).toBe(true);
    expect(isCalorieTargetVeryLow(1400, "male")).toBe(true);
    expect(isCalorieTargetVeryLow(1800, "female")).toBe(false);
  });

  it("does not flag a target of zero (treated as unset)", () => {
    expect(isCalorieTargetVeryLow(0, "female")).toBe(false);
  });
});
