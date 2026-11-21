#!/usr/bin/env node
/**
 * verify.mjs: ét kommando der svarer på "virker det stadig?"
 *
 *   1. tsc --noEmit           skal være helt rent
 *   2. eslint                 må IKKE have flere errors/warnings end baseline
 *                             (baseline/eslint-summary.json), og nye findings
 *                             vises. Når vi retter noget, må tallet kun gå ned
 *   3. next build             skal lykkes (ruteliste gemmes i baseline/ved --save)
 *
 * Kørsel:  npm run verify
 *          npm run verify -- --skip-build   (hurtig: kun tsc + eslint)
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const skipBuild = process.argv.includes("--skip-build");
let failed = false;

const run = (label, cmd, args, opts = {}) => {
  console.log(`\n=== ${label} ===`);
  const started = Date.now();
  const res = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...opts });
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  return { ...res, secs };
};

// --- 1. tsc ---
{
  const r = run("tsc", "npx", ["tsc", "--noEmit", "--incremental", "false"]);
  if (r.status === 0) console.log(`OK (${r.secs}s)`);
  else {
    failed = true;
    console.log(r.stdout || r.stderr);
    console.log(`FEJL: tsc fandt typefejl (${r.secs}s)`);
  }
}

// --- 2. eslint mod baseline ---
{
  const r = run("eslint (mod baseline)", "npx", ["eslint", "app", "components", "lib", "-f", "json"]);
  let report;
  try {
    report = JSON.parse(r.stdout);
  } catch {
    failed = true;
    console.log("FEJL: kunne ikke læse ESLint-output");
    console.log(r.stderr);
  }
  if (report) {
    const findings = new Set();
    let errors = 0;
    let warnings = 0;
    for (const f of report) {
      errors += f.errorCount;
      warnings += f.warningCount;
      for (const m of f.messages) {
        const file = f.filePath.split("/next-rom-app/")[1];
        findings.add(`${m.severity === 2 ? "E" : "W"} ${m.ruleId} ${file}:${m.line}`);
      }
    }
    if (!existsSync("baseline/eslint-summary.json")) {
      failed = true;
      console.log("FEJL: baseline/eslint-summary.json findes ikke (skridt 0 er ikke kørt)");
    } else {
      const base = JSON.parse(readFileSync("baseline/eslint-summary.json", "utf8"));
      console.log(`Nu: ${errors} errors, ${warnings} warnings | Baseline: ${base.errors} errors, ${base.warnings} warnings`);
      // Linjenumre flytter sig når filer redigeres, så sammenlign på tal + regel/fil.
      const key = (s) => s.replace(/:\d+$/, "");
      const baseKeys = new Map();
      for (const s of base.findings) baseKeys.set(key(s), (baseKeys.get(key(s)) ?? 0) + 1);
      const nowKeys = new Map();
      for (const s of findings) nowKeys.set(key(s), (nowKeys.get(key(s)) ?? 0) + 1);
      const added = [...nowKeys].filter(([k, n]) => n > (baseKeys.get(k) ?? 0)).map(([k]) => k);
      if (errors > base.errors || warnings > base.warnings || added.length > 0) {
        failed = true;
        console.log("FEJL: ESLint er blevet VÆRRE end baseline. Nye findings:");
        for (const a of added) console.log("  +", a);
      } else if (errors < base.errors || warnings < base.warnings) {
        console.log(`OK, bedre end baseline (${base.errors - errors} færre errors, ${base.warnings - warnings} færre warnings). Opdater baseline/eslint-summary.json når du vil låse forbedringen.`);
      } else {
        console.log("OK (uændret ift. baseline)");
      }
    }
  }
}

// --- 3. build ---
if (skipBuild) {
  console.log("\n=== next build ===\nSprunget over (--skip-build)");
} else {
  const r = run("next build", "npx", ["next", "build"]);
  const out = (r.stdout || "") + (r.stderr || "");
  if (r.status === 0) {
    const routes = out.split("\n").filter((l) => /^[┌├└]\s/.test(l));
    console.log(routes.join("\n"));
    console.log(`OK (${r.secs}s)`);
  } else {
    failed = true;
    console.log(out.split("\n").slice(-40).join("\n"));
    console.log(`FEJL: build fejlede (${r.secs}s)`);
  }
}

console.log(failed ? "\n❌ VERIFY FEJLEDE" : "\n✅ VERIFY OK");
process.exit(failed ? 1 : 0);
