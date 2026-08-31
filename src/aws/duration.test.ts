import { test, expect } from "bun:test";
import { formatTimeLeft, formatCountdown, formatClock } from "./duration";

const NOW = new Date("2026-06-11T12:00:00.000Z").getTime();
const inMs = (ms: number) => new Date(NOW + ms);

test("formatTimeLeft renders hours, minutes and the sub-minute tail", () => {
  expect(formatTimeLeft(inMs(2 * 3600_000 + 5 * 60_000), NOW)).toBe("2h 05m");
  expect(formatTimeLeft(inMs(47 * 60_000), NOW)).toBe("47m");
  expect(formatTimeLeft(inMs(38_000), NOW)).toBe("38s"); // no longer collapses to "0m"
});

test("formatTimeLeft flags expired and missing values", () => {
  expect(formatTimeLeft(inMs(-1), NOW)).toBe("expired");
  expect(formatTimeLeft(null, NOW)).toBe("—");
  expect(formatTimeLeft("not-a-date", NOW)).toBe("—");
});

test("formatTimeLeft accepts ISO strings", () => {
  expect(formatTimeLeft(new Date(NOW + 60 * 60_000).toISOString(), NOW)).toBe("1h 00m");
});

test("formatCountdown reads as prose and never goes negative", () => {
  expect(formatCountdown(inMs(9 * 60_000 + 42_000), NOW)).toBe("9m 42s");
  expect(formatCountdown(inMs(3600_000 + 180_000), NOW)).toBe("1h 3m");
  expect(formatCountdown(inMs(-5000), NOW)).toBe("0s");
});

test("formatClock tolerates junk", () => {
  expect(formatClock(null)).toBe("—");
  expect(formatClock("nope")).toBe("—");
  expect(formatClock(new Date(NOW).toISOString())).not.toBe("—");
});
