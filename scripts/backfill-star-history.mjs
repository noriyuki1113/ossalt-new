#!/usr/bin/env node
/**
 * スター数の履歴を、git の履歴（data-source/tools.json の過去のコミット）から復元する。
 * 一度だけ使う想定（data-source/star-history.json が無いとき）。以降は build-data.mjs が毎日追記する。
 */
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { appendHistory } from "./star-history-lib.mjs";

const OUT = "data-source/star-history.json";
const log = execFileSync(
  "git",
  ["log", "--reverse", "--date=format-local:%Y-%m-%d", "--format=%H %ad", "--", "data-source/tools.json"],
  { encoding: "utf8", env: { ...process.env, TZ: "Asia/Tokyo" } }
)
  .trim()
  .split("\n");

const history = {};
for (const line of log) {
  const [sha, date] = line.split(" ");
  let raw;
  try {
    raw = JSON.parse(execFileSync("git", ["show", `${sha}:data-source/tools.json`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
  } catch {
    continue;
  }
  const tools = Array.isArray(raw) ? raw : raw.tools;
  appendHistory(history, tools, date);
}
fs.writeFileSync(OUT, JSON.stringify(history) + "\n");
console.log(`${log.length}件のコミットから ${Object.keys(history).length}件のツールの履歴を作成`);
