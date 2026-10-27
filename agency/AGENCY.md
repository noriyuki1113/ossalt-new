# OSSALT SEO Agency — Operating Rules

> 実行の手順は `agency/README.md`、運用モードは `.claude/skills/ossalt-seo/SKILL.md`、優先順位の考え方は `agency/PRIORITY.md`、成果物の雛形は `agency/templates/` にあります。

One Claude Code agent, five **sequential** roles, with versioned handoffs. This is a decision and review workflow, not an autonomous publishing bot.

## 部門と道具（すべて手動実行。定期実行のGitHub Actionsは追加しない）
| 部門 | 成果物 | 使う道具（コードで処理できることはAIに任せない） |
| --- | --- | --- |
| Strategist | STRATEGY.md | `scripts/seo-agency.mjs`（GSC CSV→候補・採点）、`scripts/gsc-weekly-report.mjs` |
| Writer | BRIEF.md、PAGE.md | `docs/content-writing-guide.md`、`scripts/content-check.mjs` |
| Linker | LINKS.md | `scripts/seo-links.mjs`（データ上の関連と、実在のページ） |
| Technician | TECH.md | `scripts/seo-audit.mjs`（ビルド済み `out/` の読み取り専用の監査） |
| Analyst | LEDGER.md、WEEKLY.md | `scripts/seo-ledger.mjs`（28日・約90日の期限管理） |

## Order and outputs
1. **Strategist:** read CLIENT.md, actual dated GSC exports, existing URLs and live search results. Write STRATEGY.md (proposal, not an assumed fact).
2. **Writer:** only after strategy approval, write BRIEF.md and draft edits. Never invent feature support, license terms, security scores, comparisons, performance results or testimonials.
3. **Linker:** inspect existing routes/source; propose only valid, useful contextual links in LINKS.md. No invented URLs, forced exact-match anchors, link purchases or exchanges.
4. **Technician:** check content evidence, build/tests, indexability, canonical, sitemap, metadata, mobile usability and existing noindex conventions. Write TECH.md.
5. **Analyst:** in a fresh review context, check the evidence, PR diff, actual GSC numbers and LEDGER.md. Report measured outcomes and unknowns separately.

Each stage reads earlier files. A writer must not approve their own output. Store working files in ignored agency/reports/ or in the proposed PR description; never publish unreviewed drafts.

## Non-negotiable rules
- Prioritize users comparing OSS with SaaS: /alternatives/, hand-written /compare/ guides, /licenses/, /tools/, /guide/. Rankings alone are NOT revenue.
- Separate non-brand queries (e.g. excluding "ossalt") from branded queries. A page-level GSC export must be explicitly filtered in the Search Console UI; the query CSV cannot validate that page filter.
- For ranking claims, inspect the **exact query AND page** combination in GSC. Aggregated average positions across queries are only triage hints. Do not match query and page CSV rows by assumption.
- Observe actual search results by market, language and date. Do not treat snippet position, keyword volume, rankings or future traffic as guaranteed.
- Content must add verified OSS-specific value: sourced license/version info, maintained dates, direct comparisons and honest limitations. Generic template duplication is not enough.
- Do not modify sites, paid systems, analytics settings, data pipelines or deployment workflows while merely doing SEO triage.
- Every change is proposed in a PR and reviewed by the owner. Never auto-merge, deploy, buy links, contact anyone, or change paid settings.
- Explicit approval before changing a keyword pattern, removing/redirecting URLs, altering noindex/canonical/robots, bulk content generation, or any external outreach.
- Check current work before creating new pages. Protect existing hand-reviewed guides and preserve previous SEO improvements.
- Track **clicks, relevant visits and conversions** separately. No conversion attribution without trustworthy analytics data.
- Log release date, changed URL, query and exact before data. Check at 28 days for early signals and approximately 90 days for longer-term direction. The 90-day mark is a planning convention, not a Google rule; fix factual or technical mistakes immediately.
- Avoid publishing large batches. Choose up to 2 existing-page changes and up to 2 new pages per week, only if each has verifiable distinct value.
- Do not insert fake author identities, claims of personal testing, or unsupported JSON-LD reviews. Respect existing OSSALT editorial rules and source attribution.

## Stop/approval gates
A. Confirm CLIENT.md goals and conversion assumptions with the owner.
B. Propose a shortlist; the owner approves the target query/pattern and first editorial brief.
C. Prepare the draft PR with evidence and tests; the owner approves before merge.
D. Check verified outcomes later; never manufacture metrics when Search Console is unavailable.

## Weekly checklist
1. Export or ingest dated GSC data without committing raw exports.
2. Run the repo's existing `scripts/gsc-weekly-report.mjs` or `scripts/seo-agency.mjs` for candidate discovery.
3. Inspect candidate pages and exact query-page filters, then review live search results.
4. Recommend the **smallest set** of justified actions, with URLs and evidence.
5. Prepare a draft PR (only if approved); record it in LEDGER.md.
6. Compare exact filters on future reviews. Mark unavailable or unready evidence as **not assessed**.
