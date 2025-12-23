import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatTime,
  formatDistance,
  formatDate,
  toISODate,
  getTodayISO,
  toAssetUrl,
  getAgeCategory,
  formatWind,
  formatResultWithWind,
  getStatusLabel,
  getInitials,
  getDaysUntil,
} from "../../src/lib/formatters";

describe("formatTime", () => {
  it("formats seconds under 60 as SS.ss", () => {
    expect(formatTime(12.34)).toBe("12.34");
    expect(formatTime(9.5)).toBe("9.50");
    expect(formatTime(0)).toBe("0.00");
    expect(formatTime(59.99)).toBe("59.99");
  });

  it("formats seconds 60-3599 as M:SS.ss", () => {
    expect(formatTime(60)).toBe("1:00.00");
    expect(formatTime(90.5)).toBe("1:30.50");
    expect(formatTime(125.75)).toBe("2:05.75");
    expect(formatTime(3599.99)).toBe("59:59.99");
  });

  it("formats seconds >= 3600 as H:MM:SS.ss", () => {
    expect(formatTime(3600)).toBe("1:00:00.00");
    expect(formatTime(3661.5)).toBe("1:01:01.50");
    expect(formatTime(7325.25)).toBe("2:02:05.25");
  });
});

describe("formatDistance", () => {
  it("formats distance with 2 decimals and unit", () => {
    expect(formatDistance(4.56)).toBe("4.56 m");
    expect(formatDistance(10)).toBe("10.00 m");
    expect(formatDistance(0)).toBe("0.00 m");
  });
});

describe("formatDate", () => {
  it("formats ISO date to Finnish locale", () => {
    expect(formatDate("2025-12-21")).toBe("21.12.2025");
    expect(formatDate("2025-01-05")).toBe("5.1.2025");
  });
});

describe("getStatusLabel", () => {
  it("returns Finnish labels for known statuses", () => {
    expect(getStatusLabel("valid")).toBe("Hyväksytty");
    expect(getStatusLabel("nm")).toBe("NM - Ei tulosta");
    expect(getStatusLabel("dns")).toBe("DNS - Ei startannut");
    expect(getStatusLabel("dnf")).toBe("DNF - Keskeytti");
    expect(getStatusLabel("dq")).toBe("DQ - Hylätty");
  });

  it("handles null/undefined/unknown", () => {
    expect(getStatusLabel(null)).toBe("");
    expect(getStatusLabel(undefined)).toBe("");
    expect(getStatusLabel("unknown")).toBe("UNKNOWN");
  });
});

describe("getInitials", () => {
  it("returns uppercase initials", () => {
    expect(getInitials("Emma", "Korhonen")).toBe("EK");
    expect(getInitials("anna", "virtanen")).toBe("AV");
  });
});

describe("formatWind", () => {
  it("returns empty string for null/undefined", () => {
    expect(formatWind(null)).toBe("");
    expect(formatWind(undefined)).toBe("");
  });

  it("formats positive wind with + prefix", () => {
    expect(formatWind(1.5)).toBe("+1.5");
    expect(formatWind(0)).toBe("+0.0");
  });

  it("formats negative wind without + prefix", () => {
    expect(formatWind(-1.5)).toBe("-1.5");
  });

  it("adds w suffix for wind-assisted results (14+ years, wind > 2.0)", () => {
    // Athlete born 2010, result in 2025 = 15 years old, wind 2.5 > 2.0
    expect(formatWind(2.5, 2010, 2025)).toBe("+2.5w");
  });

  it("does not add w suffix for athletes under 14", () => {
    // Athlete born 2015, result in 2025 = 10 years old
    expect(formatWind(2.5, 2015, 2025)).toBe("+2.5");
  });

  it("does not add w suffix when wind <= 2.0", () => {
    expect(formatWind(2.0, 2010, 2025)).toBe("+2.0");
    expect(formatWind(1.9, 2010, 2025)).toBe("+1.9");
  });
});

describe("toISODate", () => {
  it("converts Date to ISO format YYYY-MM-DD", () => {
    // Use UTC times to avoid timezone issues
    expect(toISODate(new Date("2025-12-21T12:00:00Z"))).toBe("2025-12-21");
    expect(toISODate(new Date("2025-01-05T12:00:00Z"))).toBe("2025-01-05");
  });

  it("handles different months correctly", () => {
    expect(toISODate(new Date("2025-06-15T12:00:00Z"))).toBe("2025-06-15");
    expect(toISODate(new Date("2024-02-29T12:00:00Z"))).toBe("2024-02-29"); // Leap year
  });
});

describe("getTodayISO", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns today's date in ISO format", () => {
    vi.setSystemTime(new Date("2025-12-23T10:00:00"));
    expect(getTodayISO()).toBe("2025-12-23");
  });

  it("handles year boundaries", () => {
    // Use UTC midday to avoid timezone edge cases
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
    expect(getTodayISO()).toBe("2025-01-01");

    vi.setSystemTime(new Date("2024-12-31T12:00:00Z"));
    expect(getTodayISO()).toBe("2024-12-31");
  });
});

describe("toAssetUrl", () => {
  it("returns empty string for null/undefined", () => {
    expect(toAssetUrl(null)).toBe("");
    expect(toAssetUrl(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(toAssetUrl("")).toBe("");
  });

  it("converts file path to asset URL", () => {
    // The mock returns asset://localhost/{path}
    expect(toAssetUrl("C:/photos/test.jpg")).toBe("asset://localhost/C:/photos/test.jpg");
  });
});

describe("getAgeCategory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15")); // Mid-year 2025
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns age with 'v' suffix for children under 7", () => {
    expect(getAgeCategory(2025)).toBe("0v"); // Born this year
    expect(getAgeCategory(2024)).toBe("1v");
    expect(getAgeCategory(2022)).toBe("3v");
    expect(getAgeCategory(2020)).toBe("5v");
    expect(getAgeCategory(2019)).toBe("6v");
  });

  it("returns T7 for 7-8 year olds", () => {
    expect(getAgeCategory(2018)).toBe("T7"); // 7 years old
    expect(getAgeCategory(2017)).toBe("T7"); // 8 years old
  });

  it("returns T9 for 9-10 year olds", () => {
    expect(getAgeCategory(2016)).toBe("T9"); // 9 years old
    expect(getAgeCategory(2015)).toBe("T9"); // 10 years old
  });

  it("returns T11 for 11-12 year olds", () => {
    expect(getAgeCategory(2014)).toBe("T11"); // 11 years old
    expect(getAgeCategory(2013)).toBe("T11"); // 12 years old
  });

  it("returns T13 for 13-14 year olds", () => {
    expect(getAgeCategory(2012)).toBe("T13"); // 13 years old
    expect(getAgeCategory(2011)).toBe("T13"); // 14 years old
  });

  it("returns T15 for 15-16 year olds", () => {
    expect(getAgeCategory(2010)).toBe("T15"); // 15 years old
    expect(getAgeCategory(2009)).toBe("T15"); // 16 years old
  });

  it("returns T17 for 17-18 year olds", () => {
    expect(getAgeCategory(2008)).toBe("T17"); // 17 years old
    expect(getAgeCategory(2007)).toBe("T17"); // 18 years old
  });

  it("returns N for adults (19+)", () => {
    expect(getAgeCategory(2006)).toBe("N"); // 19 years old
    expect(getAgeCategory(2000)).toBe("N"); // 25 years old
    expect(getAgeCategory(1990)).toBe("N"); // 35 years old
  });
});

describe("formatResultWithWind", () => {
  it("formats time result without wind", () => {
    expect(formatResultWithWind(12.34, "time")).toBe("12.34");
    expect(formatResultWithWind(65.5, "time")).toBe("1:05.50");
  });

  it("formats distance result without wind", () => {
    expect(formatResultWithWind(4.56, "distance")).toBe("4.56 m");
  });

  it("formats time result with wind", () => {
    expect(formatResultWithWind(12.34, "time", 1.5)).toBe("12.34 (+1.5)");
    expect(formatResultWithWind(12.34, "time", -0.5)).toBe("12.34 (-0.5)");
  });

  it("formats distance result with wind", () => {
    expect(formatResultWithWind(5.67, "distance", 1.8)).toBe("5.67 m (+1.8)");
  });

  it("handles null/undefined wind", () => {
    expect(formatResultWithWind(12.34, "time", null)).toBe("12.34");
    expect(formatResultWithWind(12.34, "time", undefined)).toBe("12.34");
  });

  it("shows wind-assisted marker for 14+ with wind > 2.0", () => {
    expect(formatResultWithWind(12.34, "time", 2.5, 2010, 2025)).toBe("12.34 (+2.5w)");
  });

  it("does not show wind-assisted for under 14", () => {
    expect(formatResultWithWind(12.34, "time", 2.5, 2015, 2025)).toBe("12.34 (+2.5)");
  });
});

describe("getDaysUntil", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-12-23T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 for today", () => {
    expect(getDaysUntil("2025-12-23")).toBe(0);
  });

  it("returns positive days for future dates", () => {
    expect(getDaysUntil("2025-12-24")).toBe(1);
    expect(getDaysUntil("2025-12-30")).toBe(7);
    expect(getDaysUntil("2026-01-01")).toBe(9);
  });

  it("returns negative days for past dates", () => {
    expect(getDaysUntil("2025-12-22")).toBe(-1);
    expect(getDaysUntil("2025-12-16")).toBe(-7);
  });

  it("handles year boundaries", () => {
    vi.setSystemTime(new Date("2025-12-31T12:00:00"));
    expect(getDaysUntil("2026-01-01")).toBe(1);
    expect(getDaysUntil("2025-12-30")).toBe(-1);
  });
});
