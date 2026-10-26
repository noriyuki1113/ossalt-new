# OSSALT SEO Agency — first-run guide

The project already has a GSC CSV priority script (`node scripts/gsc-weekly-report.mjs`). This addition introduces an SEO-agency workflow and a two-export **read-only** weekly triage report. Nothing changes public pages, deployments, or indexed URLs.

## 1. Export factual search data
From the verified `ossalt.jp` Google Search Console property, choose Performance → Search results → **Web** → last three complete months. Exclude the brand query (`ossalt`) using the query filter. Export **Queries** and **Pages** CSV using the same date/search settings. GSC exports may limit rows; the report is only as complete as the export.

Store the exported files locally in the ignored `agency/data/` folder, e.g. `agency/data/queries.csv` and `agency/data/pages.csv`. Do **not** commit private Search Console exports.

Important: a page CSV's query filter cannot be inferred from its rows. Apply the non-brand filter in the GSC UI **before** exporting both reports. Brand removal within a query CSV is only an additional defense, not a substitute.

## 2. Generate weekly candidate list

```bash
node scripts/seo-agency.mjs \
  --queries agency/data/queries.csv \
  --pages agency/data/pages.csv \
  --period "2026-07-01 to 2026-09-30 (Web, non-brand)" \
  --brand ossalt \
  --pages-nonbrand-confirmed \
  --out agency/reports/weekly.md
```

The `--pages-nonbrand-confirmed` flag is your explicit statement that **both CSVs** were exported with the query filter applied in GSC. Omit it if unsure: the report remains usable but clearly marks the page-level data as *filter unverified*.

No Search Console API permission, paid SEO tool, API key, GitHub Actions, or new database is required.

## 3. Ask Claude Code to run the five stages
- Read `agency/AGENCY.md`, `agency/CLIENT.md`, and `agency/reports/weekly.md`.
- Strategist: propose **up to two changes** and **one new pattern** with evidence; request owner approval.
- Writer: draft an original, source-backed brief; do not invent features or duplicate generic pages.
- Linker: verify the source routes of natural internal links and prepare exact diffs.
- Technician: run checks, build and indexing review. No automatic changes to robots or canonical.
- Analyst: use a separate review pass; inspect the PR and record a baseline in `agency/LEDGER.md`.

The report is a **shortlist**, not a ranking promise or proof that a query belongs to a particular page. Use GSC exact Query + Page filters before making any changes. Consult live search results and primary OSS sources.

## 4. Decide and measure
Draft changes in a GitHub PR; merge only after owner approval. Record PR link, URL, target exact query, baseline date range, why, and a 28-day / 90-day review date. A 90-day wait does **not** apply to factual corrections or technical breakages.

## 5. Tests
```bash
node --test scripts/seo-agency.test.mjs scripts/gsc-weekly-report.test.mjs
```

### Not included in phase 1
Automatic GSC API authentication, unattended article publication, scheduled GitHub Actions, backlink purchases or traffic/conversion forecasts. Add those only with a verified account and explicit approval.
