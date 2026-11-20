// Neon Coast Studio is an offline cover-art editor and a make.fun gta6-cover-art-01 entry.
// Preview the static app with `node serve.ts`, then open http://localhost:8080.
// The grader uses /output. For a local build, set MAKEFUN_OUTPUT_DIR to stand in for it:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const source = fileURLToPath(new URL(".", import.meta.url));
const destination = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(destination, { recursive: true });
for (const folder of ["app", "screenshots"]) {
  cpSync(join(source, folder), join(destination, folder), { recursive: true });
}

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

mkdirSync(join(destination, "screenshots"), { recursive: true });
writeFileSync(join(destination, "dossier.json"), buildDossier(destination, caps));
