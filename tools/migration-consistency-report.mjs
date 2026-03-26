import { readFile } from "node:fs/promises";
import process from "node:process";

async function main() {
  const manifestPath =
    process.argv[2] ?? new URL("../docs/phase-9-migration-manifest.json", import.meta.url);
  const resolvedPath =
    manifestPath instanceof URL ? manifestPath : new URL(`file://${process.cwd()}/${manifestPath}`);

  const raw = await readFile(resolvedPath, "utf8");
  const manifest = JSON.parse(raw);

  const failures = [];
  if (!Array.isArray(manifest.waves) || manifest.waves.length === 0) {
    failures.push("manifest must contain at least one migration wave");
  }

  const seenWaves = new Set();
  for (const wave of manifest.waves ?? []) {
    if (!wave.wave || typeof wave.wave !== "string") {
      failures.push("every wave must contain a string wave code");
      continue;
    }
    if (seenWaves.has(wave.wave)) {
      failures.push(`duplicate wave code: ${wave.wave}`);
    }
    seenWaves.add(wave.wave);

    for (const field of [
      "legacySources",
      "v2Targets",
      "dataEntities",
      "cutoverCriteria",
      "rollbackCriteria",
    ]) {
      if (!Array.isArray(wave[field]) || wave[field].length === 0) {
        failures.push(`wave ${wave.wave} must define non-empty ${field}`);
      }
    }
  }

  for (const field of [
    "sanitationRules",
    "nonMigratedByDefault",
    "legacyDeactivationCriteria",
  ]) {
    if (!Array.isArray(manifest[field]) || manifest[field].length === 0) {
      failures.push(`manifest must define non-empty ${field}`);
    }
  }

  if (failures.length > 0) {
    console.error("Migration manifest validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Migration manifest validation passed.");
  console.log(`Version: ${manifest.version}`);
  console.log(`Generated at: ${manifest.generatedAt}`);
  console.log(`Waves: ${manifest.waves.length}`);

  for (const wave of manifest.waves) {
    console.log(
      `${wave.wave}: ${wave.name} | legacy=${wave.legacySources.length} | v2=${wave.v2Targets.length} | entities=${wave.dataEntities.length}`,
    );
  }
}

main().catch((error) => {
  console.error("Failed to generate migration consistency report.");
  console.error(error);
  process.exitCode = 1;
});
