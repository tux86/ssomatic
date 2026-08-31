import React from "react";
import { Box, render as inkRender, useInput } from "ink";
import { ActionBar, ActionItem } from "./ActionBar.js";
import { Wordmark } from "./Wordmark.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";

export interface AppProps {
  title?: string;
  icon?: string;
  color?: string;
  actions?: ActionItem[];
  statusItems?: React.ReactNode[];
  /** Mount a global `q` → onQuit handler. Use ONLY on blocking screens that own no input. */
  captureQuit?: boolean;
  children: React.ReactNode;
  onQuit?: () => void;
}

/**
 * Layout bounds. The shell used to be pinned at a flat 68 columns, which forced
 * long values (SSO device URLs above all) to wrap on terminals with plenty of
 * room to spare. It now grows with the window, still capped so text does not
 * run into unreadably long lines on a maximised terminal.
 */
export const MIN_WIDTH = 46;
export const MAX_WIDTH = 104;
const HORIZONTAL_PADDING = 1;

/** Width available to `App`'s children, i.e. inside its padding. */
export function useContentWidth(): number {
  const { columns } = useTerminalSize();
  const shell = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, columns - 1));
  return shell - HORIZONTAL_PADDING * 2;
}

function Divider() {
  return (
    <Box
      borderStyle="single"
      borderTop
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderColor="gray"
    />
  );
}

export function App({
  actions,
  statusItems,
  captureQuit = false,
  children,
  onQuit,
}: AppProps) {
  const contentWidth = useContentWidth();
  const hasStatusItems = !!statusItems && statusItems.length > 0;

  // Global quit handler for blocking screens (seeding / no-profiles) that
  // otherwise have no useInput of their own. Ctrl-C remains native.
  useInput(
    (input) => {
      if (input === "q") onQuit?.();
    },
    { isActive: captureQuit },
  );

  return (
    <Box flexDirection="column" paddingX={HORIZONTAL_PADDING} paddingY={1} width={contentWidth + HORIZONTAL_PADDING * 2}>
      {/* Header */}
      <Box marginBottom={1}>
        <Wordmark />
      </Box>

      {/* Content */}
      <Box flexDirection="column">{children}</Box>

      {/* Status bar */}
      {hasStatusItems && (
        <Box flexDirection="column" marginTop={1}>
          <Divider />
          <Box gap={2}>
            {statusItems.map((item, i) => (
              <React.Fragment key={i}>{item}</React.Fragment>
            ))}
          </Box>
        </Box>
      )}

      {/* Action bar */}
      {actions && actions.length > 0 && (
        <Box flexDirection="column" marginTop={hasStatusItems ? 0 : 1}>
          <Divider />
          <ActionBar actions={actions} />
        </Box>
      )}
    </Box>
  );
}

// Render helper
export function renderApp(element: React.ReactElement) {
  return inkRender(element);
}
