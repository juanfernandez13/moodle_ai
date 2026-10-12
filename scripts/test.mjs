import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

async function find(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? find(join(directory, entry.name))
        : entry.name.endsWith(".test.ts")
          ? [join(directory, entry.name)]
          : [],
    ),
  );
  return files.flat().sort();
}
const tests = await find("tests");
if (!tests.length) throw new Error("Nenhum teste encontrado.");
const child = spawn(process.execPath, ["--test", ...tests], {
  stdio: "inherit",
});
child.on("error", () => {
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
