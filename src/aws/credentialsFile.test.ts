import { test, expect } from "bun:test";
import { parseCredentials, upsertProfile, unquote } from "./credentialsFile";

const TOKEN = "IQoJb3JpZ2luX2VjEB+abc/def+ghi==";

test("upsertProfile writes session tokens unquoted so the AWS CLI can read them", () => {
  const out = upsertProfile("", "prod", {
    aws_access_key_id: "ASIAEXAMPLE",
    aws_secret_access_key: "sec/ret+key=",
    aws_session_token: TOKEN,
  });
  expect(out).toContain(`aws_session_token = ${TOKEN}`);
  expect(out).not.toContain('"');
});

test("AWS-style parsing (verbatim after the first '=') round-trips", () => {
  const out = upsertProfile("", "prod", { aws_session_token: TOKEN });
  // Mirrors @smithy/core's parseIni: everything after the first '=' is the value.
  const line = out.split("\n").find((l) => l.startsWith("aws_session_token"))!;
  expect(line.slice(line.indexOf("=") + 1).trim()).toBe(TOKEN);
});

test("upsertProfile preserves other profiles, comments and blank lines", () => {
  const before = ["# hand written", "[other]", "aws_access_key_id = AKIAOTHER", "", "[prod]", "aws_access_key_id = OLD", "region = eu-west-1", ""].join("\n");
  const after = upsertProfile(before, "prod", { aws_access_key_id: "NEW", aws_session_token: TOKEN });

  expect(after).toContain("# hand written");
  expect(after).toContain("aws_access_key_id = AKIAOTHER");
  expect(after).toContain("region = eu-west-1"); // untouched key in the same section
  expect(after).toContain("aws_access_key_id = NEW");
  expect(after).toContain(`aws_session_token = ${TOKEN}`);
  expect(after).not.toContain("OLD");
});

test("upsertProfile appends a new section without clobbering the file", () => {
  const after = upsertProfile("[other]\naws_access_key_id = AKIAOTHER\n", "prod", { aws_access_key_id: "NEW" });
  expect(parseCredentials(after)).toEqual({
    other: { aws_access_key_id: "AKIAOTHER" },
    prod: { aws_access_key_id: "NEW" },
  });
});

test("parseCredentials heals values quoted by older versions", () => {
  const legacy = `[prod]\naws_session_token = "${TOKEN}"\n`;
  expect(parseCredentials(legacy).prod!.aws_session_token).toBe(TOKEN);
});

test("parseCredentials ignores comments and keyless lines", () => {
  const text = "[prod]\n; a comment\n# another\n\naws_access_key_id = A\n";
  expect(parseCredentials(text)).toEqual({ prod: { aws_access_key_id: "A" } });
});

test("unquote leaves unquoted and mismatched-quote values alone", () => {
  expect(unquote("plain")).toBe("plain");
  expect(unquote('"quoted"')).toBe("quoted");
  expect(unquote('"mismatched')).toBe('"mismatched');
});
