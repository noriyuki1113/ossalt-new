/**
 * エージェントに許す操作の検査（claude-quickstarts/autonomous-coding の security.py に相当）。
 *  - bashCheck(): Bash コマンドを許可リストで検査する（純粋関数）
 *  - scrubEnv(): 子プロセスに渡す環境変数から、認証情報を取り除く
 * 方針：許可リストにないものは拒否。ネットワーク・公開・書き込み系（curl, gh, git push など）は拒否。
 */

const ALLOWED = new Set([
  "ls", "cat", "head", "tail", "wc", "grep", "rg", "diff", "sort", "uniq", "tr", "pwd", "echo", "mkdir", "touch",
  "git", "node", "npm", "npx",
]);

const GIT_ALLOWED = new Set(["status", "diff", "log", "show", "add", "commit", "checkout", "switch", "branch", "restore", "rev-parse", "stash"]);
const NPM_RUN_ALLOWED = /^(test|test:e2e|test:e2e:desktop|test:e2e:mobile|build|qa|data)$/;
const NPX_ALLOWED = new Set(["playwright", "tsc"]);

/** 引用符の外にある ; && || | & で分割する（引用符の中は分割しない）。 */
export function splitCommand(cmd) {
  const parts = [];
  let cur = "";
  let quote = null;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (quote) {
      cur += c;
      if (c === quote) quote = null;
      else if (c === "\\" && quote === '"') cur += cmd[++i] ?? "";
      continue;
    }
    if (c === '"' || c === "'") { quote = c; cur += c; continue; }
    // 2>&1 や &> の & はリダイレクトであって区切りではない
    const isRedirectAmp = c === "&" && (cmd[i - 1] === ">" || cmd[i + 1] === ">");
    if (!isRedirectAmp && (c === ";" || c === "|" || c === "&" || c === "\n")) {
      if ((c === "|" || c === "&") && cmd[i + 1] === c) i++;
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  if (quote) return null; // 引用符が閉じていない
  parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

export function tokenize(segment) {
  const out = [];
  const re = /"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(segment))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

/** @returns {{ok: true} | {ok: false, reason: string}} */
export function bashCheck(command) {
  if (typeof command !== "string" || !command.trim()) return { ok: false, reason: "空のコマンド" };
  if (/[`]|\$\(|<\(|>\(/.test(command)) return { ok: false, reason: "コマンド置換は使えません" };
  if (/(^|[^>])>(?!>|&)\s*\/(?!tmp\/)/.test(command) || />>?\s*\.\./.test(command)) {
    return { ok: false, reason: "作業ディレクトリの外への書き込みは使えません" };
  }
  const segments = splitCommand(command);
  if (!segments) return { ok: false, reason: "引用符が閉じていません" };
  for (const seg of segments) {
    const tokens = tokenize(seg.replace(/\s+\d?>>?\s*\S+/g, "").replace(/\s+2>&1/g, ""));
    if (tokens.length === 0) continue;
    const [cmd, ...args] = tokens;
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(cmd)) return { ok: false, reason: "環境変数の指定つきのコマンドは使えません" };
    if (!ALLOWED.has(cmd)) return { ok: false, reason: `許可されていないコマンド: ${cmd}` };

    if (cmd === "git") {
      const sub = args.find((a) => !a.startsWith("-"));
      if (!sub || !GIT_ALLOWED.has(sub)) return { ok: false, reason: `許可されていない git の操作: ${sub ?? "(なし)"}（push・reset・merge・fetch などは使えません）` };
      if (args.some((a) => /^(--force|-f|--hard|--amend|--no-verify)$/.test(a))) return { ok: false, reason: "危険な git のオプション" };
      if (sub === "checkout" && args.includes("--")) {
        // ファイルの復元は許可。ブランチ作成は autodev/ 以外を拒否
      }
      if ((sub === "checkout" || sub === "switch" || sub === "branch") && args.some((a) => /^(main|master|claude\/ossalt-jp-setup-deploy-tsv3x8)$/.test(a))) {
        return { ok: false, reason: "公開用のブランチには切り替えられません" };
      }
    } else if (cmd === "npm") {
      const [sub, runName] = args;
      if (sub === "test") continue;
      if (sub === "run" && NPM_RUN_ALLOWED.test(runName ?? "")) continue;
      return { ok: false, reason: `許可されていない npm の操作: ${args.join(" ")}（install・publish は使えません）` };
    } else if (cmd === "npx") {
      const tool = args.find((a) => !a.startsWith("-"));
      if (!NPX_ALLOWED.has(tool)) return { ok: false, reason: `許可されていない npx のツール: ${tool}` };
      if (tool === "playwright" && !/^(test|show-report)$/.test(args[args.indexOf(tool) + 1] ?? "")) {
        return { ok: false, reason: "playwright は test・show-report だけ使えます" };
      }
    } else if (cmd === "node") {
      if (args.some((a) => /^(-e|--eval|-p|--print|-r|--require)$/.test(a))) return { ok: false, reason: "node -e は使えません" };
      const script = args.find((a) => !a.startsWith("-"));
      if (!script || !/^(\.\/)?(scripts|autodev|e2e)\//.test(script)) return { ok: false, reason: "node で実行できるのは scripts/・autodev/・e2e/ の中だけです" };
    }
  }
  return { ok: true };
}

const SECRET_NAME = /(TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|API_?KEY|PRIVATE|COOKIE|SESSION|AUTH|^GH_|^GITHUB_|^AWS_|^GOOGLE_|^ANTHROPIC_|^CLAUDE_|^CF_|^CLOUDFLARE_|^NPM_)/i;
const KEEP = new Set(["PATH", "HOME", "LANG", "LC_ALL", "TZ", "TERM", "CI", "NODE_ENV", "PLAYWRIGHT_BROWSERS_PATH", "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD", "NEXT_TELEMETRY_DISABLED", "TMPDIR"]);

/**
 * ブラウザ・テスト・ビルドに渡す環境変数。認証情報（トークン、APIキー、プロキシの資格情報を含むURL）は渡さない。
 * extra で明示したものだけ追加できる（E2E_* など）。
 */
export function scrubEnv(env, extra = {}) {
  const out = {};
  for (const [k, v] of Object.entries(env)) {
    if (v == null) continue;
    if (SECRET_NAME.test(k)) continue;
    if (KEEP.has(k) || /^(E2E_|NEXT_PUBLIC_|NODE_OPTIONS$)/.test(k)) out[k] = v;
  }
  return { ...out, ...extra };
}

/** claude CLI を起動するときの環境。モデルの呼び出しに必要な ANTHROPIC_* と CLAUDE_CODE_OAUTH_TOKEN だけ通し、GitHub などの資格情報は渡さない。 */
export function agentEnv(env) {
  const out = scrubEnv(env);
  for (const k of ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL", "CLAUDE_CODE_OAUTH_TOKEN", "HTTPS_PROXY", "HTTP_PROXY", "NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE"]) {
    if (env[k]) out[k] = env[k];
  }
  return out;
}
