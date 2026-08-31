import { useEffect, useState } from "react";
import { useStdout } from "ink";

export interface TerminalSize {
  columns: number;
  rows: number;
}

const FALLBACK: TerminalSize = { columns: 80, rows: 24 };

function read(stdout: NodeJS.WriteStream | undefined): TerminalSize {
  return {
    columns: stdout?.columns ?? FALLBACK.columns,
    rows: stdout?.rows ?? FALLBACK.rows,
  };
}

/** Current terminal dimensions, kept in sync as the window is resized. */
export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout();
  const [size, setSize] = useState<TerminalSize>(() => read(stdout));

  useEffect(() => {
    if (!stdout) return;
    const onResize = () => setSize(read(stdout));
    onResize(); // catch a resize that happened before we subscribed
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);

  return size;
}
