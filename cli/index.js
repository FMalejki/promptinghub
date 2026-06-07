#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");

const DEFAULT_HOST = process.env.PROMPTINGHUB_HOST || "https://promptinghub-night-shift.vercel.app";

function usage() {
  console.log("Usage: npx promptinghub add <owner>/<slug> [--dir <path>] [--host <url>]");
}

async function main() {
  const argv = process.argv.slice(2);
  const [cmd, ref, ...rest] = argv;
  if (cmd !== "add" || !ref) {
    usage();
    process.exit(cmd === "add" ? 1 : 0);
  }

  let dir = ".";
  let host = DEFAULT_HOST;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--dir") dir = rest[++i];
    else if (rest[i] === "--host") host = rest[++i];
  }

  const slash = ref.indexOf("/");
  const owner = slash > 0 ? ref.slice(0, slash) : "";
  const slug = slash > 0 ? ref.slice(slash + 1) : "";
  if (!owner || !slug) {
    console.error("Reference must be in the form owner/slug");
    process.exit(1);
  }

  const url = `${host.replace(/\/$/, "")}/api/p/${encodeURIComponent(owner)}/${encodeURIComponent(slug)}/manifest`;
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    console.error(`Network error reaching ${host}: ${e.message}`);
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`Could not fetch ${ref} (HTTP ${res.status})`);
    process.exit(1);
  }
  const manifest = await res.json();
  if (!manifest.files || !manifest.files.length) {
    console.error(`${ref} has no files`);
    process.exit(1);
  }

  const target = path.resolve(dir, slug);
  fs.mkdirSync(target, { recursive: true });
  for (const f of manifest.files) {
    const fp = path.join(target, f.path);
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, f.content);
    console.log(`  ${path.relative(process.cwd(), fp)}`);
  }
  const n = manifest.files.length;
  console.log(`\n✓ Installed ${manifest.name} (${n} file${n === 1 ? "" : "s"}) → ${path.relative(process.cwd(), target) || "."}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
