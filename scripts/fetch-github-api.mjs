#!/usr/bin/env node
/**
 * GitHub REST API で data-source/tools.json の「未取得」項目を補完する。
 *
 * 補完する項目:
 *   contributors / watchers / last_commit / created_at / language /
 *   license / stars_num / forks_num / github_archived / topics /
 *   scorecard_score / scorecard_date / scorecard_checks /
 *   security_md / dependabot_configured / latest_release_at /
 *   releases_12mo / advisories_count / docker_available / ja_docs / ja_ui
 *
 * セキュリティ関連の項目（2026-09-25追加）:
 *   - scorecard_*: OpenSSF Scorecard（api.securityscorecards.dev）。
 *     未収録リポジトリは404を返し続けることを実測で確認済み（タスク0）。
 *     404は「未収録」であり取得失敗ではないため、他の項目と同様に
 *     null（取得できず）として扱い、既存の値を消さない。
 *   - security_md / dependabot_configured: GitHub contents APIで
 *     SECURITY.md / .github/dependabot.yml の有無を確認。
 *     200→true、404→false、それ以外（403・5xx・タイムアウト等）→null。
 *     「無い」と「確認できなかった」を混同しない（false と null を分ける）。
 *   - latest_release_at / releases_12mo: releases API。取得できなければ両方null。
 *     リリースが無いプロジェクトは latest_release_at:null / releases_12mo:0。
 *   - advisories_count: security-advisories API。書き込み権限が無くても
 *     公開済みアドバイザリは閲覧できることを実測で確認済み。
 *
 * 使い方:
 *   GITHUB_TOKEN=ghp_xxx node scripts/fetch-github-api.mjs
 *   任意フラグ:
 *     --limit 20        先頭20件だけ取得（動作確認用）
 *     --only n8n,penpot 指定IDだけ取得
 *     --dry-run         結果を表示するだけで tools.json を書かない
 *     --shards 3 / FETCH_SHARDS=3  日付ベースで対象を1/3に絞る（後述）
 *
 * トークンなしでも動くが、GitHubは未認証だと毎時60リクエストのため
 * 336件（×2リクエスト）を処理しきれない。GitHub Actions では
 * Secrets の GITHUB_TOKEN（1リポジトリあたり1時間1,000リクエスト）が
 * 自動で入るため、そのまま実行できる。
 *
 * セキュリティ関連項目の追加後は1ツールあたり約6リクエストかかり、
 * 384件では約2,304リクエストとなって既定のGITHUB_TOKENの上限
 * （1,000/時間）を超える。上限緩和には2通りある:
 *   - Personal Access Token（上限5,000/時間、スコープ無しでよい）を
 *     Secrets に DATA_FETCH_TOKEN として登録する（GitHubはGITHUB_で
 *     始まるシークレット名を作れないため、この名前にしてはいけない）
 *   - PATが無い場合は --shards / FETCH_SHARDS で日付ベースに対象を
 *     分割し、1回の実行あたりのリクエスト数を上限内に収める
 *     （「1時間あたり」の上限は日をまたがないと回避できないため、
 *     同じ実行内で分割しても意味が無い）
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS_PATH = path.join(ROOT, "data-source", "tools.json");

const TOKEN =
  process.env.GITHUB_TOKEN || process.env.DATA_FETCH_TOKEN || process.env.GH_TOKEN || "";
const CONCURRENCY = Number(process.env.FETCH_CONCURRENCY || 4);

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1] ?? true;
};
const LIMIT = Number(flag("--limit", 0)) || 0;
const ONLY = flag("--only", null);
const DRY_RUN = argv.includes("--dry-run");
const SHARDS = Math.max(1, Number(process.env.FETCH_SHARDS || flag("--shards", 0)) || 1);

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

  // --- 2026-09追加分（48件のうち、GitHub APIがNOASSERTIONを返したもの） ---
  // リポジトリ直下ではなく doc/COPYING にライセンス本文があった
  redmine: "GPL-2.0", // https://raw.githubusercontent.com/redmine/redmine/HEAD/doc/COPYING
  // モノレポでリポジトリ直下にLICENSEが無いが、主要パッケージ trytond に
  // GPL-3.0の本文があり、他のパッケージ（例: modules/sale）にも同じ
  // LICENSEファイルが個別に置かれている（実在確認済み）
  tryton: "GPL-3.0", // https://raw.githubusercontent.com/tryton/tryton/HEAD/trytond/LICENSE

  // --- 2026-09追加分（48件のうち、上記以外でNOASSERTIONだった13件） ---
  gotify: "MIT", // https://raw.githubusercontent.com/gotify/server/HEAD/LICENSE
  "cockpit-cms": "MIT", // https://raw.githubusercontent.com/Cockpit-HQ/Cockpit/HEAD/LICENSE
  automatisch: "AGPL-3.0", // https://raw.githubusercontent.com/automatisch/automatisch/HEAD/LICENSE（.eeファイルのみ別ライセンス）
  trudesk: "Apache-2.0", // https://raw.githubusercontent.com/polonel/Trudesk/HEAD/LICENSE
  // 実際のコードライセンスはMIT。別セクションにある「InvoicePlane」という
  // 名称・ロゴの商標に関する制限は、コード自体のライセンスとは別
  invoiceplane: "MIT", // https://raw.githubusercontent.com/InvoicePlane/InvoicePlane/HEAD/LICENSE.txt
  // 「content outside pro/ ... のみ商用ライセンス」で、pro/配下は別ライセンス
  peppermint: "AGPL-3.0", // https://raw.githubusercontent.com/Peppermint-Lab/Peppermint/HEAD/license
  // GPLの "version 2 or (at your option) version 3" という文言のため、
  // 単一のSPDX標準識別子ではなくデュアルとして表示する
  keepassxc: "GPL-2.0 / GPL-3.0", // https://raw.githubusercontent.com/keepassxreboot/keepassxc/HEAD/COPYING
  typebot: "FSL 1.1", // https://raw.githubusercontent.com/baptisteArno/typebot.io/HEAD/LICENSE
  surrealdb: "BUSL 1.1", // https://raw.githubusercontent.com/surrealdb/surrealdb/HEAD/LICENSE
  // "pro/" 配下（商用機能）のみ別ライセンス。それ以外はApache-2.0
  netmaker: "Apache-2.0（pro/配下は別ライセンス）", // https://raw.githubusercontent.com/gravitl/netmaker/HEAD/LICENSE.md
  // "highlight.io/"・"enterprise/" 配下のみ別ライセンス。それ以外はApache-2.0
  highlight: "Apache-2.0（一部は別ライセンス）", // https://raw.githubusercontent.com/highlight/highlight/HEAD/LICENSE
  // ベースはAGPL-3.0だが、Commons Clause（商用販売の禁止条項）が付いている
  chaskiq: "AGPL-3.0 + Commons Clause", // https://raw.githubusercontent.com/chaskiq/chaskiq/HEAD/LICENSE.txt
  // コンポーネントごとに異なる4つのライセンスが混在（単一のライセンスではない）
  tracim: "AGPL-3.0 / LGPL-3.0 / MIT（構成要素により異なる）", // https://raw.githubusercontent.com/tracim/tracim/HEAD/LICENSE.md

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
/**
 * fetch() 自体にタイムアウトが無いと、接続が応答を返さないケースで
 * await が永遠に返らず、リトライにすら入れずプロセス全体が止まる
 * （実際に、並列数を落とした再実行や、呼び出し数を大幅に減らした
 * 軽量版スクリプトでも、6時間以上応答が返らない事態が発生して判明した。
 * レート制限のリトライ待ち（最大2分）を何度重ねても説明がつかない
 * 長さだったため、レート制限ではなくこれが原因だったと判断している）。
 * 各試行に15秒のタイムアウトを設ける。
 */
async function ghFetch(url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    let res;
    try {
      res = await fetch(url, { headers: HEADERS, signal: ctl.signal });
    } catch {
      res = null;
    } finally {
      clearTimeout(timer);
    }
    if (!res) {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      return null;
    }
    if (res.status === 200) return res;
    if (res.status === 404) return res;
    if (res.status === 403 || res.status === 429) {
      // レート制限中にリクエストを続けると統合がBANされる可能性があるため、
      // 1回だけ短く待ち（x-ratelimit-resetは最大1時間先のこともあり
      // それだけ待つのは非現実的）、解決しなければそのツールを諦めて
      // 次へ進む。値は前回のまま保持する（呼び出し側でnullを既存値に
      // 上書きしない扱いになっている）。
      if (attempt === 0) {
        console.warn(`  [rate-limit] ${res.status} — 60秒待機して再試行`);
        await new Promise((r) => setTimeout(r, 60000));
        continue;
      }
      return null;
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

/**
 * OpenSSF Scorecard REST API（api.securityscorecards.dev）。
 * 404は「そのリポジトリがScorecardの公開データセットに無い」ことを示す正常応答であり、
 * 一時的な失敗（5xx・レート制限・タイムアウト）とは区別する
 * （2026-09-25、実際にAPIを叩いて確認済み。既知のリポジトリでは200＋正しいスコアが
 * 返り、未収録のリポジトリでは一貫して404が返る）。
 * 404とネットワーク/5xxエラーのどちらも、呼び出し側では null 3項目として扱う
 * （「未取得」と「データセットに無い」を画面上で区別する情報が無いため。
 * 取得日 scorecard_date が付くので、古いデータかどうかは読者が判断できる）。
 */
async function fetchScorecard(owner, repo) {
  const url = `https://api.securityscorecards.dev/projects/github.com/${owner}/${repo}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let res;
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 10000);
      res = await fetch(url, { headers: { Accept: "application/json" }, signal: ctl.signal });
      clearTimeout(timer);
    } catch {
      res = null;
    }
    if (!res) {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      return { score: null, date: null, checks: null };
    }
    if (res.status === 404) return { score: null, date: null, checks: null };
    if (res.status === 429 || res.status >= 500) {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      return { score: null, date: null, checks: null };
    }
    if (!res.ok) return { score: null, date: null, checks: null };
    const body = await res.json().catch(() => null);
    if (!body || typeof body.score !== "number") return { score: null, date: null, checks: null };
    const checks =
      Array.isArray(body.checks) && body.checks.length
        ? Object.fromEntries(body.checks.map((c) => [c.name, c.score]))
        : null;
    return { score: body.score, date: body.date ?? null, checks };
  }
  return { score: null, date: null, checks: null };
}

/**
 * GitHub contents API でファイルの有無を確認する。
 * 200なら存在（true）、404なら不在（false）、それ以外（403・5xx・タイムアウト等）は
 * 「確認できなかった」ため null にする。false にしない
 * （「無い」と「取得できなかった」を混同すると、実際にはあるかもしれないファイルを
 * 誤って「無い」と断定することになるため）。
 */
async function checkFileExists(base, filePath) {
  const res = await ghFetch(`${base}/contents/${filePath}`);
  if (!res) return null;
  if (res.status === 200) return true;
  if (res.status === 404) return false;
  return null;
}

/**
 * Docker対応の自動判定（2026-09-26追加）。
 *
 * 次のどれかが見つかれば true（対応）:
 *   1) リポジトリ直下の Dockerfile / Compose ファイル、または
 *      docker/・deploy/・.devops/ など配布用と分かるフォルダの中のもの（深さ4階層まで）。
 *      テスト・例示・開発環境用のフォルダや、名前が *.dev.yml などのファイルは数えない。
 *      ビルド補助用のDockerfile（例: libs/zstd/native/zstd.Dockerfile）を
 *      「対応」と誤判定しないよう、直下以外はフォルダ名で絞る
 *   2) README 中の `docker run` / `docker compose` / `docker-compose` / `docker pull`
 *      や、ghcr.io・Docker Hub のイメージへの言及
 * どれも見つからなければ null（未確認）にする。false（非対応）にはしない。
 * 公式イメージを別リポジトリで配布しているプロジェクト（例: Odoo）があり、
 * 「このリポジトリに痕跡が無い」ことは「Dockerで動かせない」ことの
 * 証明にならないため。旧データの docker_available は手入力で、公式に
 * Docker配布しているツールまで false になっていた（Dify・Jellyfin 等）。
 *
 * ファイル一覧は git trees API（recursive）で1リクエストで取る。
 * 巨大なリポジトリでは一覧が途中で切れる（truncated）が、見つかった範囲で判定し、
 * 見つからなければ README に進むだけなので問題ない。
 *
 * 判定は頻繁に変わらないため、前回の判定から DOCKER_RECHECK_DAYS 日以内なら
 * 取り直さない（APIの上限を節約する）。
 *
 * 戻り値: { value: true|null, checked: boolean }。
 * API呼び出しが失敗した場合は checked:false とし、既存の判定を変えない。
 */
const DOCKER_RECHECK_DAYS = 30;
const REPO_SIGNAL_KEYS = new Set(["docker_available", "ja_docs", "ja_ui"]);
const DOCKER_FILE_RE = /^(dockerfile(\..+)?|.+\.dockerfile|(docker-)?compose(\.[\w-]+)?\.ya?ml)$/i;
// テスト・例示・CI・開発環境用のDockerfileは「利用者向けの配布」ではないので除外する
const DOCKER_EXCLUDE_DIR_RE =
  /^(tests?|testing|e2e|examples?|samples?|fixtures?|\.github|\.devcontainer|\.codesandbox|\.gitpod|\.circleci|\.gitlab|dev|dev-tools|qa|vendor|third[_-]?party|node_modules)$/i;
// 開発・テスト・CI用と名前で分かるファイル（例: docker-compose.dev.yml、Dockerfile.test）も除外する
const DOCKER_EXCLUDE_FILE_RE = /[._-](dev|develop|development|test|tests|testing|ci|e2e|local)([._-]|$)/i;
const DOCKER_MAX_DEPTH = 4;
const DOCKER_DIST_DIR_RE = /docker|container|deploy|devops|release|self-?host|hosting|install/i;
const DOCKER_README_RE =
  /\bdocker(?:-compose\b|\s+compose\b|\s+run\b|\s+pull\b)|\bghcr\.io\/|hub\.docker\.com\/r\//i;

/**
 * 判定本体（ネットワークに依存しない。テストしやすいよう分けている）。
 * paths: リポジトリ内のファイルパスの一覧 / readme: README の本文
 */
export function detectDocker({ paths = [], readme = "" }) {
  const hits = paths.filter((p) => {
    const parts = p.split("/");
    const name = parts[parts.length - 1];
    if (parts.length > DOCKER_MAX_DEPTH) return false;
    if (!DOCKER_FILE_RE.test(name) || DOCKER_EXCLUDE_FILE_RE.test(name)) return false;
    const dirs = parts.slice(0, -1);
    if (dirs.some((d) => DOCKER_EXCLUDE_DIR_RE.test(d))) return false;
    return dirs.length === 0 || dirs.some((d) => DOCKER_DIST_DIR_RE.test(d));
  });
  if (hits.length) {
    // 浅い階層のもの（直下の Dockerfile など）を代表として返す（ログ用）
    hits.sort((a, b) => a.split("/").length - b.split("/").length);
    return { kind: "file", path: hits[0] };
  }
  if (readme && DOCKER_README_RE.test(readme)) return { kind: "readme" };
  return null;
}

/**
 * 日本語対応の自動判定（2026-09-26追加）。Docker判定と同じファイル一覧・README を使う。
 *
 *   ja_docs = "official": 日本語の README / ドキュメントがリポジトリ内にある
 *     - README.ja.md・README_JP.md など日本語版 README
 *     - docs/ja/・i18n/ja/docusaurus-plugin-content-docs/ など、ドキュメント用フォルダ内の日本語版
 *     - メインの README に日本語版への言語切り替えリンクがある
 *   ja_ui = true: 画面の日本語翻訳ファイルがある
 *     - locales/ja.json・i18n/ja/…・values-ja/strings.xml・messages_ja.properties など
 *
 * 見つからなければどちらも null（未確認）。「英語のみ」「日本語非対応」とは断定しない。
 * 公式サイト側だけに日本語版がある、翻訳を別リポジトリ（Crowdin 等）で管理している、
 * といったケースがあるため。「翻訳ファイルがある」は「全画面が翻訳済み」を意味しないので、
 * 表示では「日本語の翻訳あり」と書き、「完全対応」とは書かない。
 */
const JA_SEG = "(ja|jp|ja[-_]jp)";
const JA_README_RE = new RegExp(`^readme[._-]${JA_SEG}\\.(md|markdown|rst|txt|adoc)$`, "i");
const JA_DIR_RE = new RegExp(`^(values-)?${JA_SEG}$`, "i");
const JA_FILE_RE = new RegExp(
  `(^|[._-])${JA_SEG}\\.(json|ya?ml|po|mo|properties|xlf|xliff|arb|ts|js|mjs|resx|toml|ftl|ini|php|strings|xml|lang)$`,
  "i"
);
const JA_DOC_DIR_RE = /^(docs?|documentation|website|site|guide|manual|docusaurus-plugin-content-docs)$/i;
const JA_UI_DIR_RE = /^(locales?|i18n|l10n|lang|langs|languages|translations?|messages|res|intl|po)$/i;
// 依存ライブラリをそのまま同梱したもの（日付ライブラリの ja.js 等）は数えない
const JA_EXCLUDE_DIR_RE = /^(pdfjs[\w-]*|node_modules|vendor|third[_-]?party|external|deps|tests?|e2e|fixtures?|examples?)$/i;
const JA_LINK_RE =
  /\[\s*(日本語|Japanese)\s*\]\([^)]+\)|<a [^>]*>\s*(日本語|Japanese)\s*<\/a>|readme[._-](ja|jp|ja[-_]jp)\.md/i;

export function detectJapanese({ paths = [], readme = "" }) {
  let docs = null;
  let ui = null;
  for (const p of paths) {
    const parts = p.split("/");
    const name = parts[parts.length - 1];
    const dirs = parts.slice(0, -1);
    if (dirs.some((d) => JA_EXCLUDE_DIR_RE.test(d))) continue;

    if (!docs && JA_README_RE.test(name)) docs = p;
    const jaDirIdx = dirs.findIndex((d) => JA_DIR_RE.test(d));
    const isJaFile = JA_FILE_RE.test(name);
    if (jaDirIdx === -1 && !isJaFile) continue;

    // 日本語のフォルダ・ファイルが、ドキュメント用か画面用かを、上位のフォルダ名で見分ける
    const above = jaDirIdx === -1 ? dirs : dirs.slice(0, jaDirIdx);
    const isDoc = above.some((d) => JA_DOC_DIR_RE.test(d)) || /\.(md|mdx|rst|adoc)$/i.test(name);
    if (isDoc) {
      if (!docs && /\.(md|mdx|rst|adoc|html?|txt)$/i.test(name)) docs = p;
    } else if (!ui && (above.some((d) => JA_UI_DIR_RE.test(d)) || /^values-/i.test(dirs[jaDirIdx] ?? "") || isJaFile)) {
      ui = p;
    }
    if (docs && ui) break;
  }
  if (!docs && readme && JA_LINK_RE.test(readme)) docs = "README内の日本語版リンク";
  return { docs, ui };
}

/**
 * リポジトリのファイル一覧と README から、Docker対応・日本語対応をまとめて判定する。
 * どちらも頻繁には変わらないため、前回から DOCKER_RECHECK_DAYS 日以内なら取り直さない。
 * 戻り値: { checked: boolean, docker: true|null, jaDocs: "official"|null, jaUi: true|null }
 * API呼び出しが失敗した場合は checked:false とし、既存の判定を変えない。
 */
async function fetchRepoSignals(base, branch, tool) {
  const skip = { checked: false, docker: null, jaDocs: null, jaUi: null };
  const fresh = (iso) => iso && Date.now() - Date.parse(iso) < DOCKER_RECHECK_DAYS * 86400000;
  if (fresh(tool.docker_checked_at) && fresh(tool.ja_checked_at)) return skip;

  const treeRes = await ghFetch(`${base}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  if (!treeRes || !treeRes.ok) return skip;
  const tree = await treeRes.json().catch(() => null);
  if (!Array.isArray(tree?.tree)) return skip;
  const paths = tree.tree.filter((e) => e.type === "blob").map((e) => e.path);

  let docker = detectDocker({ paths }) ? true : null;
  let ja = detectJapanese({ paths });

  // ファイルだけで決まらなかった項目は README も見る。
  // README は種類（.md / .rst / 拡張子なし）を問わず readme API で本文を取る
  if (!docker || !ja.docs) {
    const readmeRes = await ghFetch(`${base}/readme`);
    if (!readmeRes) return skip;
    if (readmeRes.status !== 404) {
      if (!readmeRes.ok) return skip;
      const body = await readmeRes.json().catch(() => null);
      const readme =
        body?.content && body.encoding === "base64" ? Buffer.from(body.content, "base64").toString("utf8") : "";
      if (!docker && detectDocker({ readme })) docker = true;
      if (!ja.docs) ja = { ...ja, docs: detectJapanese({ readme }).docs };
    }
  }
  return { checked: true, docker, jaDocs: ja.docs ? "official" : null, jaUi: ja.ui ? true : null };
}

/**
 * 最新リリース日と直近12か月のリリース数。releases APIが失敗した場合は両方null。
 *
 * 実測で判明した問題（2026-09-25）: per_page=100の1ページだけでは、
 * リリース頻度が高いプロジェクト（n8n・ollama等）で直近12か月分が
 * 100件を超え、実際の件数より少なく出ていた（ちょうど100件で頭打ち）。
 * releasesは新しい順に返るため、ページの最後の項目が365日より古くなる
 * まで、または最終ページに達するまでページングして正確な件数を数える。
 * 万一の暴走防止に最大10ページ（1,000件）で打ち切る。
 */
async function fetchReleaseInfo(base) {
  const cutoff = Date.now() - 365 * 86400000;
  let latest = null;
  let releases12mo = 0;
  let sawAny = false;

  for (let page = 1; page <= 10; page += 1) {
    const res = await ghFetch(`${base}/releases?per_page=100&page=${page}`);
    if (!res || !res.ok) {
      if (page === 1) return { latest_release_at: null, releases_12mo: null };
      break; // 2ページ目以降の失敗は、そこまでに集計した件数を採用する
    }
    const list = await res.json().catch(() => null);
    if (!Array.isArray(list) || list.length === 0) break;
    sawAny = true;

    for (const r of list) {
      const d = r.published_at || r.created_at;
      if (!d) continue;
      if (!latest || d > latest) latest = d;
      if (new Date(d).getTime() >= cutoff) releases12mo += 1;
    }

    const oldestOnPage = list[list.length - 1];
    const oldestDate = oldestOnPage?.published_at || oldestOnPage?.created_at;
    if (oldestDate && new Date(oldestDate).getTime() < cutoff) break; // 12か月分は数え終えた
    if (list.length < 100) break; // 最終ページ
  }

  if (!sawAny) return { latest_release_at: null, releases_12mo: 0 };
  return { latest_release_at: latest, releases_12mo: releases12mo };
}

/**
 * 公開されているセキュリティアドバイザリの件数。
 * このエンドポイントは対象リポジトリへの書き込み権限が無くても、公開済み
 * アドバイザリは200で返ってくることを実際に確認済み（2026-09-25）。
 *
 * 実測で判明した問題（2回）:
 *   1) per_page=100の1ページだけだと、100件を超えるプロジェクト
 *      （gitea・n8n等）でちょうど100件に頭打ちしていた。
 *   2) その修正として contributors と同じ「per_page=1でLinkヘッダの
 *      rel="last"から総件数を得る」方式に切り替えたところ、この
 *      エンドポイントはLinkヘッダのページ番号形式が異なるらしく
 *      totalFromLink が一致せず、全件が0/1に化けた（実測で確認、
 *      224件あった advisories_count>0 が全件 1 になっていた）。
 * そのため releases と同じ「per_page=100で実際にページングして
 * 配列の件数を数える」方式に統一する。最大10ページ（1,000件）で打ち切る。
 */
/** Link ヘッダの rel="next" のURLをそのまま返す（無ければnull）。 */
function nextUrlFromLink(linkHeader) {
  if (!linkHeader) return null;
  const m = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return m ? m[1] : null;
}

/**
 * security-advisories は ?page=N を渡しても同じ1ページ目が返り続けた
 * （実測: 7件で「ちょうど1000」＝1ページ目を10回数えた形跡になった）。
 * page=N を自分で組み立てるのではなく、Linkヘッダのrel="next"が
 * 示すURLをそのまま辿る（ページネーション方式をこちらで仮定しない）。
 * 同じURLが繰り返し返る異常も検知して打ち切る。
 */
async function fetchAdvisoriesCount(base) {
  let total = 0;
  let sawAny = false;
  let url = `${base}/security-advisories?per_page=100`;
  const seen = new Set();

  for (let i = 0; i < 20 && url && !seen.has(url); i += 1) {
    seen.add(url);
    const res = await ghFetch(url);
    if (!res || !res.ok) return sawAny ? total : null;
    const list = await res.json().catch(() => null);
    if (!Array.isArray(list) || list.length === 0) break;
    sawAny = true;
    total += list.length;
    url = nextUrlFromLink(res.headers.get("link"));
  }

  return sawAny ? total : 0;
}

async function fetchOne(slug, id, tool) {
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

  // セキュリティ関連シグナル（タスク1）。既存の repo/contributors 取得とは
  // 独立しており、どれか1つが失敗しても他の項目・他のツールには影響しない。
  const [scorecard, securityMd, dependabotConfigured, releaseInfo, advisoriesCount, signals] = await Promise.all([
    fetchScorecard(...slug.split("/")),
    checkFileExists(base, "SECURITY.md"),
    checkFileExists(base, ".github/dependabot.yml"),
    fetchReleaseInfo(base),
    fetchAdvisoriesCount(base),
    repo.default_branch ? fetchRepoSignals(base, repo.default_branch, tool) : { checked: false },
  ]);

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
      scorecard_score: scorecard.score,
      scorecard_date: scorecard.date,
      scorecard_checks: scorecard.checks,
      security_md: securityMd,
      dependabot_configured: dependabotConfigured,
      latest_release_at: releaseInfo.latest_release_at,
      releases_12mo: releaseInfo.releases_12mo,
      advisories_count: advisoriesCount,
      // 判定できたときだけ入れる（null＝未確認も上書きする。下の書き込み処理を参照）
      ...(signals.checked
        ? {
            docker_available: signals.docker,
            docker_checked_at: new Date().toISOString(),
            ja_docs: signals.jaDocs,
            ja_ui: signals.jaUi,
            ja_checked_at: new Date().toISOString(),
          }
        : {}),
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

  if (SHARDS > 1) {
    // 「1時間あたり」のAPI上限を日をまたいで回避するため、担当分を日付で決める。
    // 同じ実行内で分割しても合計リクエスト数は変わらないため意味が無い。
    const now = new Date();
    const dayOfYear = Math.floor(
      (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
        Date.UTC(now.getUTCFullYear(), 0, 0)) /
        86400000
    );
    const shardIndex = dayOfYear % SHARDS;
    targets = targets.filter((_, i) => i % SHARDS === shardIndex);
    console.log(`シャード ${shardIndex + 1}/${SHARDS}（${targets.length}件を取得）`);
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
      const res = await fetchOne(parsed.slug, tool.id, tool);
      done += 1;

      if (!res.ok) {
        failed.push({ id: tool.id, url: tool.github_url, reason: res.reason });
      } else {
        // API が null を返した項目（例: ライセンスが NOASSERTION）は、既に入っている値を消さない。
        // 「未取得を補完する」スクリプトなので、取得できなかったことを理由に既知の値を捨てない。
        for (const [k, v] of Object.entries(res.data)) {
          // docker_available / ja_docs / ja_ui の null は「判定した結果、痕跡が無かった（未確認）」
          // なので、旧データの値（誤った false や、README だけで決めた "none" を含む）を残さず上書きする。
          if (v === null && tool[k] != null && !REPO_SIGNAL_KEYS.has(k)) continue;
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

// テストから detectDocker だけを読み込むときは実行しない
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((err) => {
  console.error("失敗:", err);
  process.exit(1);
});
