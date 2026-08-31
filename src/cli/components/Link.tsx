import React from "react";
import { Text } from "ink";

const ESC = "\u001B";
const BEL = "\u0007";

/**
 * Wrap `text` in an OSC 8 hyperlink pointing at `url`.
 *
 * Without this, a terminal can only guess where a URL starts and ends by
 * scanning the rendered characters — so a URL long enough to wrap becomes two
 * unrelated fragments and clicking the first opens a truncated address. An
 * OSC 8 link binds the target to the *cells*, so the whole thing stays one
 * clickable link no matter where the line breaks.
 */
export function hyperlink(url: string, text: string): string {
  return `${ESC}]8;;${url}${BEL}${text}${ESC}]8;;${BEL}`;
}

/**
 * Terminals that predate OSC 8 ignore the sequence silently, so the risk of
 * emitting it is low — but honour the usual opt-outs, and skip it when there is
 * no terminal to interpret it (piped output, `TERM=dumb`, CI logs).
 */
export function supportsHyperlinks(
  env: NodeJS.ProcessEnv = process.env,
  isTTY: boolean = Boolean(process.stdout.isTTY),
): boolean {
  if (env.AWSSESH_NO_HYPERLINKS || env.NO_HYPERLINK) return false;
  if (env.FORCE_HYPERLINK) return env.FORCE_HYPERLINK !== "0";
  if (env.CI) return false;
  if (!isTTY || !env.TERM || env.TERM === "dumb") return false;
  return true;
}

export interface LinkProps {
  url: string;
  /** Visible label; defaults to the URL itself. */
  children?: string;
  color?: string;
  dimColor?: boolean;
  underline?: boolean;
}

/** A clickable URL that survives line wrapping. */
export function Link({ url, children, color = "cyan", dimColor, underline = true }: LinkProps) {
  const label = children ?? url;
  return (
    <Text color={color} dimColor={dimColor} underline={underline}>
      {supportsHyperlinks() ? hyperlink(url, label) : label}
    </Text>
  );
}
