import React from "react";
import { Box, Text } from "ink";

/**
 * A keyboard-shortcut hint: key char(s) in bold cyan followed by a dim label.
 *
 * Spacing is the container's job (`<Box gap={2}>`) rather than trailing spaces
 * baked into the text, which Ink trims when a row wraps — that is what used to
 * smear the hints together into `c copy envy name o console` on narrow terminals.
 */
export function Key({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <Box flexShrink={0}>
      <Text bold color="cyan">
        {k}
      </Text>
      <Text dimColor> {children}</Text>
    </Box>
  );
}

/** A row of `Key` hints that wraps cleanly and keeps each hint intact. */
export function KeyBar({ children }: { children: React.ReactNode }) {
  return (
    <Box gap={2} flexWrap="wrap">
      {children}
    </Box>
  );
}
