import { test, expect } from "bun:test";
import { hyperlink, supportsHyperlinks } from "./Link";

const ESC = "\u001B";
const BEL = "\u0007";
const URL = "https://totalenergies.awsapps.com/start/#/device?user_code=NFQW-XCWQ";

test("hyperlink wraps the label in an OSC 8 link", () => {
  expect(hyperlink(URL, URL)).toBe(`${ESC}]8;;${URL}${BEL}${URL}${ESC}]8;;${BEL}`);
});

test("the link carries the whole URL even when the label is shortened", () => {
  const out = hyperlink(URL, "device login");
  expect(out).toContain(URL);
  expect(out).toContain("device login");
});

test("hyperlinks are suppressed where they cannot be rendered", () => {
  expect(supportsHyperlinks({ TERM: "xterm-256color" }, false)).toBe(false); // piped output
  expect(supportsHyperlinks({ TERM: "dumb" }, true)).toBe(false);
  expect(supportsHyperlinks({}, true)).toBe(false); // no TERM at all
  expect(supportsHyperlinks({ TERM: "xterm-256color", CI: "true" }, true)).toBe(false);
});

test("hyperlinks honour the documented opt-outs", () => {
  expect(supportsHyperlinks({ TERM: "xterm-256color", AWSSESH_NO_HYPERLINKS: "1" }, true)).toBe(false);
  expect(supportsHyperlinks({ TERM: "xterm-256color", NO_HYPERLINK: "1" }, true)).toBe(false);
});

test("FORCE_HYPERLINK overrides detection in both directions", () => {
  expect(supportsHyperlinks({ FORCE_HYPERLINK: "1" }, false)).toBe(true);
  expect(supportsHyperlinks({ TERM: "xterm-256color", FORCE_HYPERLINK: "0" }, true)).toBe(false);
});

test("a normal interactive terminal gets hyperlinks", () => {
  expect(supportsHyperlinks({ TERM: "xterm-256color" }, true)).toBe(true);
});
