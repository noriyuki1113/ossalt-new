#!/usr/bin/env node
/**
 * GitHub REST API で data-source/tools.json の「未取得」項目を補完する。
 *
 * 補完する項目:
 *   contributors / watchers / last_commit / created_at / language /
 *   license / stars_num / forks_num / github_archived / topics
 *
 * 使い方:
 *   GITHUB_TOKEN=ghp_xxx node scripts/fetch-github-api.mjs
 *   任意フラグ:
 *     --limit 20        先頭20件だけ取得（動作確認用）
 *     --only n8n,penpot 指定IDだけ取得
 *     --dry-run         結果を表示するだけで tools.json を書かない
 *
 * トークンなしでも動くが、GitHubは未認証だと毎時60リクエストのため
 * 336件（×2リクエスト）を処理しきれない。GitHub Actions では
 * Secrets の GITHUB_TOKEN が自動で入るため、そのまま実行できる。
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS_PATH = path.join(ROOT, "data-source", "tools.json");

const TOKEN =
  process.env.GITHUB_TOKEN || process.env.GITHUB_DATA_TOKEN || process.env.GH_TOKEN || "";
const CONCURRENCY = Number(process.env.FETCH_CONCURRENCY || 4);

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1] ?? true;
};
const LIMIT = Number(flag("--limit", 0)) || 0;
const ONLY = flag("--only", null);
const DRY_RUN = argv.includes("--dry-run");

/**
 * GitHub API が license を取得できない（spdx_id が無い、または "NOASSERTION"）
 * ツールの手動上書き表。
 *
 * 「NOASSERTION」は主に2パターンで起きる:
 *   (a) GitHubのライセンス検出器が単純に読み取れなかった（実体は標準ライセンス）
 *   (b) 標準SPDXに無い独自ライセンス（fair-code / BUSL / SSPL / Elastic License 等）
 *
 * ここに入れる値は、各リポジトリの実際の LICENSE ファイルを直接読んで確認したものだけ。
 * 推測は入れない（確認できなかったものは対象外のまま null にする）。
 * 各行のコメントが確認に使った実ファイルのURL。
 *
 * (a) 標準ライセンスだが検出器が拾えなかったもの → 通常のSPDX表記で上書き
 * (b) 独自ライセンス → そのライセンスの名称をそのまま表示する
 *     （フィルタのライセンス欄にSPDXと違う名前で並ぶため、それ自体が
 *     「標準OSSライセンスではない」ことの目印になる）
 */
const LICENSE_OVERRIDES = {
  // --- (a) 標準ライセンスなのに NOASSERTION だったもの ---
  "stirling-pdf": "MIT", // https://raw.githubusercontent.com/Stirling-Tools/Stirling-PDF/HEAD/LICENSE
  affine: "MIT", // https://raw.githubusercontent.com/toeverything/AFFiNE/HEAD/LICENSE
  twenty: "AGPL-3.0", // https://raw.githubusercontent.com/twentyhq/twenty/HEAD/LICENSE
  "rocket-chat": "MIT", // https://raw.githubusercontent.com/RocketChat/Rocket.Chat/HEAD/LICENSE
  posthog: "MIT", // https://raw.githubusercontent.com/PostHog/posthog/HEAD/LICENSE
  mattermost: "Apache-2.0", // https://raw.githubusercontent.com/mattermost/mattermost/HEAD/LICENSE.txt
  chatwoot: "MIT", // https://raw.githubusercontent.com/chatwoot/chatwoot/HEAD/LICENSE
  activepieces: "MIT", // https://raw.githubusercontent.com/activepieces/activepieces/HEAD/LICENSE
  formbricks: "AGPL-3.0", // https://raw.githubusercontent.com/formbricks/formbricks/HEAD/LICENSE
  baserow: "MIT", // https://raw.githubusercontent.com/baserow/baserow/HEAD/LICENSE
  // joplinのLICENSEは「ディレクトリ単位の例外を除きAGPL-3.0-or-later」という文面
  joplin: "AGPL-3.0", // https://raw.githubusercontent.com/laurent22/joplin/HEAD/LICENSE
  mediawiki: "GPL-2.0", // https://raw.githubusercontent.com/wikimedia/mediawiki/HEAD/COPYING（v2 or later）
  // COPYINGはMPLの1条項通知のみだが、内容よりMPL-2.0であることは明記されている
  "collabora-online": "MPL-2.0", // https://raw.githubusercontent.com/CollaboraOnline/online/HEAD/COPYING
  odoo: "LGPL-3.0", // https://raw.githubusercontent.com/odoo/odoo/HEAD/LICENSE
  revolt: "AGPL-3.0", // https://raw.githubusercontent.com/stoatchat/stoatchat/HEAD/LICENSE
  focalboard: "Apache-2.0", // https://raw.githubusercontent.com/mattermost-community/focalboard/HEAD/LICENSE.txt
  // COPYINGは3条項のBSDスタイル（再配布・無保証・無endorsement）
  trac: "BSD-3-Clause", // https://raw.githubusercontent.com/edgewall/trac/HEAD/COPYING
  lightdash: "MIT", // https://raw.githubusercontent.com/lightdash/lightdash/HEAD/LICENSE
  openreplay: "AGPL-3.0", // https://raw.githubusercontent.com/openreplay/openreplay/HEAD/LICENSE
  signoz: "MIT", // https://raw.githubusercontent.com/SigNoz/signoz/HEAD/LICENSE
  bugsink: "BSD-3-Clause", // https://raw.githubusercontent.com/bugsink/bugsink/HEAD/LICENSE
  supertokens: "Apache-2.0", // https://raw.githubusercontent.com/supertokens/supertokens-core/HEAD/LICENSE.md
  seafile: "GPL-2.0", // https://raw.githubusercontent.com/haiwen/seafile/HEAD/LICENSE.txt
  photoprism: "AGPL-3.0", // https://raw.githubusercontent.com/photoprism/photoprism/HEAD/LICENSE
  borg: "BSD-3-Clause", // https://raw.githubusercontent.com/borgbackup/borg/HEAD/LICENSE（3条項確認済み）
  openshot: "GPL-3.0", // https://raw.githubusercontent.com/OpenShot/openshot-qt/HEAD/COPYING
  audacity: "GPL-3.0", // https://raw.githubusercontent.com/audacity/audacity/HEAD/LICENSE.txt
  caprover: "Apache-2.0", // https://raw.githubusercontent.com/caprover/caprover/HEAD/LICENSE
  gnucash: "GPL-2.0", // https://raw.githubusercontent.com/Gnucash/gnucash/HEAD/LICENSE
  opensign: "AGPL-3.0", // https://raw.githubusercontent.com/OpenSignLabs/OpenSign/HEAD/LICENSE
  limesurvey: "GPL-2.0", // https://raw.githubusercontent.com/LimeSurvey/LimeSurvey/HEAD/LICENSE
  mautic: "GPL-3.0", // https://raw.githubusercontent.com/mautic/mautic/HEAD/LICENSE.txt
  vendure: "GPL-3.0", // https://raw.githubusercontent.com/vendurehq/vendure/HEAD/LICENSE.md
  opencart: "GPL-3.0", // https://raw.githubusercontent.com/opencart/opencart/HEAD/LICENSE.md
  flowise: "Apache-2.0", // https://raw.githubusercontent.com/FlowiseAI/Flowise/HEAD/LICENSE.md
  quivr: "Apache-2.0", // https://raw.githubusercontent.com/The-Vibe-Company/quivr/HEAD/LICENSE
  // doc/license/GPL-license.txt の実体はGPL v2（"or later"の明記は無い）
  blender: "GPL-2.0", // https://raw.githubusercontent.com/blender/blender/HEAD/COPYING
  jan: "Apache-2.0", // https://raw.githubusercontent.com/janhq/jan/HEAD/LICENSE
  pgadmin: "PostgreSQL", // https://raw.githubusercontent.com/pgadmin-org/pgadmin4/HEAD/LICENSE
  pgvector: "PostgreSQL", // https://raw.githubusercontent.com/pgvector/pgvector/HEAD/LICENSE
  strapi: "MIT", // https://raw.githubusercontent.com/strapi/strapi/HEAD/LICENSE
  // license.txt（小文字）に本文。v2 or later
  woocommerce: "GPL-2.0", // https://raw.githubusercontent.com/woocommerce/woocommerce/HEAD/license.txt

  // --- (b) 標準SPDXに無い独自ライセンス（名称をそのまま表示） ---
  n8n: "Sustainable Use License", // https://raw.githubusercontent.com/n8n-io/n8n/HEAD/LICENSE.md
  nocodb: "Sustainable Use License", // https://raw.githubusercontent.com/nocodb/nocodb/HEAD/LICENSE.md
  metabase: "AGPL-3.0 / Metabase Commercial", // https://raw.githubusercontent.com/metabase/metabase/HEAD/LICENSE.txt（デュアル）
  outline: "BUSL 1.1", // https://raw.githubusercontent.com/outline/outline/HEAD/LICENSE
  budibase: "BUSL 1.1", // https://raw.githubusercontent.com/Budibase/budibase/HEAD/LICENSE
  nocobase: "NocoBase License", // https://raw.githubusercontent.com/nocobase/nocobase/HEAD/LICENSE.txt
  anytype: "Any Source Available License", // https://raw.githubusercontent.com/anyproto/anytype-ts/HEAD/LICENSE.md
  planka: "PLANKA Community License", // https://raw.githubusercontent.com/plankanban/planka/HEAD/LICENSE.md
  goatcounter: "EUPL派生（独自条項）", // https://raw.githubusercontent.com/arp242/goatcounter/HEAD/LICENSE
  countly: "Countly Lite License", // https://raw.githubusercontent.com/Countly/countly-server/HEAD/LICENSE.md
  rudderstack: "Elastic License 2.0", // https://raw.githubusercontent.com/rudderlabs/rudder-server/HEAD/LICENSE
  sentry: "FSL 1.1", // https://raw.githubusercontent.com/getsentry/sentry/HEAD/LICENSE.md
  graylog: "SSPL 1.0", // https://raw.githubusercontent.com/Graylog2/graylog2-server/HEAD/LICENSE
  cachet: "Cachet License", // https://raw.githubusercontent.com/cachethq/cachet/HEAD/LICENSE.md
  vault: "BUSL 1.1", // https://raw.githubusercontent.com/hashicorp/vault/HEAD/LICENSE
  terraform: "BUSL 1.1", // https://raw.githubusercontent.com/hashicorp/terraform/HEAD/LICENSE
  // トリプルライセンス（既定はAGPL/SSPL/Elasticのいずれか選択制、x-pack配下のみElastic固定）
  elasticsearch: "AGPL-3.0 / SSPL / Elastic-2.0", // https://raw.githubusercontent.com/elastic/elasticsearch/HEAD/LICENSE.txt
  adminer: "Apache-2.0 / GPL-2.0", // https://raw.githubusercontent.com/vrana/adminer/HEAD/LICENSE（デュアル）
  "open-webui": "Open WebUI License", // https://raw.githubusercontent.com/open-webui/open-webui/HEAD/LICENSE
  lobechat: "LobeHub Community License", // https://raw.githubusercontent.com/lobehub/lobehub/HEAD/LICENSE
  dify: "Apache-2.0（改変条項あり）", // https://raw.githubusercontent.com/langgenius/dify/HEAD/LICENSE
  "arize-phoenix": "Elastic License 2.0", // https://raw.githubusercontent.com/Arize-ai/phoenix/HEAD/LICENSE
  "invoice-ninja": "Elastic License 2.0", // https://raw.githubusercontent.com/invoiceninja/invoiceninja/HEAD/LICENSE
  akaunting: "BUSL 1.1", // https://raw.githubusercontent.com/akaunting/akaunting/HEAD/LICENSE.txt
  tldraw: "tldraw License", // https://raw.githubusercontent.com/tldraw/tldraw/HEAD/LICENSE.md
  prestashop: "OSL-3.0（コアのみ）", // https://raw.githubusercontent.com/PrestaShop/PrestaShop/HEAD/LICENSE.md

  // directus / inkscape / dokploy は、リポジトリ直下に LICENSE ファイルが
  // 見つからず（inkscapeは開発本体がGitLab側で、GitHubは同期用ミラー）、
  // package.json の license フィールドにも記載が無かったため、確認できないまま
  // null（未取得）にしている。ここには入れない。
};

const HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "ossalt.jp-data-pipeline",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

/** github_url から owner / repo を取り出す。 */
function parseRepo(url) {
  if (!url) return null;
  const m = String(url).match(
    /^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/?#\s]+)/i
  );
  if (!m) return null;
  const owner = m[1];
  const repo = m[2].replace(/\.git$/i, "");
  if (!owner || !repo) return null;
  return { owner, repo, slug: `${owner}/${repo}` };
}

/** レート制限に当たったらリセット時刻まで待って1回だけ再試行する。 */
async function ghFetch(url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.status === 200) return res;
    if (res.status === 404) return res;
    if (res.status === 403 || res.status === 429) {
      const reset = Number(res.headers.get("x-ratelimit-reset") || 0);
      const waitMs = reset ? Math.max(0, reset * 1000 - Date.now()) + 2000 : 8000;
      if (attempt < 2) {
        console.warn(
          `  [rate-limit] ${res.status} — ${Math.round(waitMs / 1000)}秒待機して再試行`
        );
        await new Promise((r) => setTimeout(r, Math.min(waitMs, 120000)));
        continue;
      }
    }
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    return res;
  }
  return null;
}

/** Link ヘッダの rel="last" から総件数を得る（contributors の件数取得に使う）。 */
function totalFromLink(linkHeader) {
  if (!linkHeader) return null;
  const m = linkHeader.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
  return m ? Number(m[1]) : null;
}

async function fetchOne(slug, id) {
  const base = `https://api.github.com/repos/${slug}`;
  const repoRes = await ghFetch(base);

  if (!repoRes) return { ok: false, reason: "network" };
  if (repoRes.status === 404) return { ok: false, reason: "404 リポジトリが存在しない" };
  if (repoRes.status === 451) return { ok: false, reason: "451 法的制限で取得不可" };
  if (!repoRes.ok) return { ok: false, reason: `HTTP ${repoRes.status}` };

  const repo = await repoRes.json();

  // contributors: per_page=1 で1件だけ取り、Link の last から総数を得る（1リクエストで済む）
  let contributors = null;
  const contribRes = await ghFetch(`${base}/contributors?per_page=1&anon=1`);
  if (contribRes && contribRes.ok) {
    contributors = totalFromLink(contribRes.headers.get("link"));
    if (contributors == null) {
      const list = await contribRes.json().catch(() => null);
      if (Array.isArray(list)) contributors = list.length || null;
    }
  }

  return {
    ok: true,
    data: {
      stars_num: typeof repo.stargazers_count === "number" ? repo.stargazers_count : null,
      forks_num: typeof repo.forks_count === "number" ? repo.forks_count : null,
      // API の subscribers_count が「ウォッチしている人数」。watchers_count はスター数と同義なので使わない。
      watchers: typeof repo.subscribers_count === "number" ? repo.subscribers_count : null,
      contributors,
      last_commit: repo.pushed_at || null,
      created_at: repo.created_at || null,
      language: repo.language || null,
      license:
        repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION"
          ? repo.license.spdx_id
          : LICENSE_OVERRIDES[id] ?? null,
      github_archived: repo.archived === true,
      ...(Array.isArray(repo.topics) && repo.topics.length ? { topics: repo.topics } : {}),
      github_checked_at: new Date().toISOString(),
    },
  };
}

async function main() {
  const raw = JSON.parse(await readFile(TOOLS_PATH, "utf8"));
  const isWrapped = !Array.isArray(raw) && Array.isArray(raw.tools);
  const tools = isWrapped ? raw.tools : raw;

  let targets = tools.filter((t) => parseRepo(t.github_url));
  if (ONLY) {
    const ids = String(ONLY).split(",").map((s) => s.trim()).filter(Boolean);
    targets = targets.filter((t) => ids.includes(t.id));
  }
  if (LIMIT) targets = targets.slice(0, LIMIT);

  if (!TOKEN) {
    console.warn(
      "⚠️  GITHUB_TOKEN が未設定です。未認証は毎時60リクエストのため、" +
        "対象が多いと途中でレート制限に達します。"
    );
  }
  console.log(`対象: ${targets.length}件 / 全体 ${tools.length}件（並列 ${CONCURRENCY}）`);

  const queue = [...targets];
  let done = 0;
  let updated = 0;
  const failed = [];

  async function worker() {
    while (queue.length) {
      const tool = queue.shift();
      const parsed = parseRepo(tool.github_url);
      const res = await fetchOne(parsed.slug, tool.id);
      done += 1;

      if (!res.ok) {
        failed.push({ id: tool.id, url: tool.github_url, reason: res.reason });
      } else {
        // API が null を返した項目（例: ライセンスが NOASSERTION）は、既に入っている値を消さない。
        // 「未取得を補完する」スクリプトなので、取得できなかったことを理由に既知の値を捨てない。
        for (const [k, v] of Object.entries(res.data)) {
          if (v === null && tool[k] != null) continue;
          tool[k] = v;
        }
        updated += 1;
      }
      if (done % 25 === 0 || done === targets.length) {
        console.log(`  ${done}/${targets.length} 件処理済み（成功 ${updated}）`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, worker));

  // 健全度スコアは4項目すべて揃ったときだけ再計算する（一部だけの合計を出さない）
  const computed = tools.filter(
    (t) =>
      typeof t.stars_num === "number" &&
      typeof t.forks_num === "number" &&
      typeof t.contributors === "number" &&
      typeof t.watchers === "number"
  );
  for (const t of computed) {
    const days = t.last_commit
      ? Math.min(Math.max(0, Math.floor((Date.now() - new Date(t.last_commit)) / 86400000)), 90)
      : 0;
    t.health_score = Math.round(
      t.stars_num * 0.25 +
        t.forks_num * 0.5 +
        t.contributors * 0.5 +
        t.watchers * 0.25 -
        days * 0.5
    );
  }

  console.log(
    `\n完了: 成功 ${updated} / 失敗 ${failed.length} / 健全度スコア算出 ${computed.length}件`
  );
  if (failed.length) {
    console.log("取得できなかったもの:");
    for (const f of failed.slice(0, 20)) console.log(`  - ${f.id}: ${f.reason}`);
    if (failed.length > 20) console.log(`  …ほか ${failed.length - 20}件`);
  }

  if (DRY_RUN) {
    console.log("(--dry-run のため書き込みません)");
    return;
  }

  await writeFile(
    TOOLS_PATH,
    JSON.stringify(isWrapped ? { ...raw, tools } : tools, null, 2) + "\n"
  );
  console.log(`書き込み: ${path.relative(ROOT, TOOLS_PATH)}`);
}

main().catch((err) => {
  console.error("失敗:", err);
  process.exit(1);
});
