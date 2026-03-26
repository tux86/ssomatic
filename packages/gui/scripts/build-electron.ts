/**
 * Bundles Electron main + preload from TypeScript to JavaScript.
 * - main: ESM (Electron supports ESM main)
 * - preload: CJS (Electron sandboxed preload requires CommonJS)
 */

async function build() {
  // Bundle main process (ESM - Electron supports this with "type": "module")
  const main = await Bun.build({
    entrypoints: ["./electron/main.ts"],
    outdir: "./dist-electron",
    target: "node",
    format: "esm",
    external: ["electron"],
  });

  if (!main.success) {
    console.error("Failed to build main:", main.logs);
    process.exit(1);
  }

  // Bundle preload (MUST be CJS for Electron sandboxed preload)
  const preload = await Bun.build({
    entrypoints: ["./electron/preload.ts"],
    outdir: "./dist-electron",
    target: "node",
    format: "cjs",
    external: ["electron"],
  });

  if (!preload.success) {
    console.error("Failed to build preload:", preload.logs);
    process.exit(1);
  }

  console.log("Electron build OK → dist-electron/");
}

build();
