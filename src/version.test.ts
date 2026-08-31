import { test, expect } from "bun:test";
import { compareVersions } from "./version";

test("compareVersions orders release versions numerically, not lexically", () => {
  expect(compareVersions("2.10.0", "2.9.0")).toBeGreaterThan(0); // would sort wrong as strings
  expect(compareVersions("2.0.0", "2.0.0")).toBe(0);
  expect(compareVersions("1.9.9", "2.0.0")).toBeLessThan(0);
  expect(compareVersions("v2.1.0", "2.0.9")).toBeGreaterThan(0); // tolerates a `v` prefix
});

test("a local build ahead of the latest tag is not offered a downgrade", () => {
  expect(compareVersions("2.0.0", "2.1.0")).toBeLessThan(0);
});

test("compareVersions ranks pre-releases below their release", () => {
  expect(compareVersions("2.0.0", "2.0.0-rc.1")).toBeGreaterThan(0);
  expect(compareVersions("2.0.0-rc.1", "2.0.0-rc.2")).toBeLessThan(0);
});
