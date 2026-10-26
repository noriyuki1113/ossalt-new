---
name: ossalt-seo
description: Run evidence-based, approval-gated SEO analysis and editorial changes for ossalt.jp using its Google Search Console CSV exports. Use for weekly SEO planning, page briefs, internal links, technical checks, and outcome review.
---

# OSSALT SEO Skill

Use **one agent sequentially in five roles**, not five parallel agents. Begin every invocation by reading:
1. `agency/AGENCY.md` — binding safeguards, approvals, limits.
2. `agency/CLIENT.md` — site, audience and editorial constraints.
3. `agency/LEDGER.md` — history and evaluation dates.
4. Latest local `agency/reports/` report if present; otherwise request dated GSC exports or use no-data mode.

Flow: Strategist → (owner approves) → Writer → Linker → Technician → Analyst in a fresh review context → (owner approves) PR. Write handoff documents in `agency/reports/` or the PR; do not expose raw GSC files.

If supplied with exports, run `node scripts/seo-agency.mjs --queries ... --pages ... --period ...` and use its ranking only as triage. No exact query/page relationship can be inferred from the two aggregated files.

You must check existing routes, live search intent, licensing/OSS primary sources, indexability conventions and relevant tests before proposing code changes. Never silently change production content, merge PRs, deploy, purchase backlinks, or fabricate performance and conversion data. A missing data source is **unknown**, not zero.

Return a concise recommendation: measurable baseline, target URL + exact query, verified evidence, change rationale, risks, proposed PR and review dates. If there is insufficient data, provide a bounded request for the missing export instead of inventing targets.
