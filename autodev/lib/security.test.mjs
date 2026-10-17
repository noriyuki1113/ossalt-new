import test from "node:test";
import assert from "node:assert/strict";
import { bashCheck, scrubEnv, agentEnv, splitCommand } from "./security.mjs";

const ok = (c) => assert.equal(bashCheck(c).ok, true, `許可されるべき: ${c}`);
const ng = (c) => assert.equal(bashCheck(c).ok, false, `拒否されるべき: ${c}`);

test("許可するコマンド", () => {
  ok("ls -la src");
  ok("git status");
  ok("git diff --stat && git add -A");
  ok('git commit -m "fix: a; b"');
  ok("npm test");
  ok("npm run build");
  ok("npm run test:e2e");
  ok("npx playwright test --project=mobile");
  ok("node autodev/qa.mjs --sweep");
  ok("grep -rn foo src | head -5");
  ok("npm run qa 2>&1 | tail -20");
});

test("ネットワーク・公開・破壊的な操作は拒否", () => {
  for (const c of [
    "curl https://example.com", "wget x", "gh pr merge 1", "ssh host", "sudo ls", "rm -rf out",
    "git push origin main", "git push", "git reset --hard", "git merge x", "git fetch", "git pull", "git clean -fd",
    "git commit --amend", "git commit --no-verify -m x", "git checkout main", "git switch claude/ossalt-jp-setup-deploy-tsv3x8",
    "npm install left-pad", "npm publish", "npm ci", "npx --yes serve", "npx playwright install",
    "node -e 'process.exit()'", "node ../evil.js", "python3 x.py", "bash -c ls", "env FOO=1 ls", "FOO=1 ls",
    "echo $(whoami)", "echo `id`", "cat x > /etc/passwd", "ls ; rm -rf /", "ls && curl x",
  ]) ng(c);
});

test("引用符の中の区切り文字では分割しない／閉じていない引用符は拒否", () => {
  assert.deepEqual(splitCommand('echo "a;b" && ls'), ['echo "a;b"', "ls"]);
  assert.equal(splitCommand('echo "a'), null);
  ng('echo "a');
});

test("scrubEnv は認証情報を取り除く", () => {
  const env = {
    PATH: "/bin", HOME: "/root", GITHUB_TOKEN: "x", GH_TOKEN: "x", ANTHROPIC_API_KEY: "x", NPM_TOKEN: "x",
    AWS_SECRET_ACCESS_KEY: "x", CLOUDFLARE_API_TOKEN: "x", HTTPS_PROXY: "http://user:pw@proxy", E2E_PORT: "4180", RANDOM_VAR: "x",
    NEXT_PUBLIC_SITE_URL: "https://ossalt.jp",
  };
  const out = scrubEnv(env);
  assert.deepEqual(Object.keys(out).sort(), ["E2E_PORT", "HOME", "NEXT_PUBLIC_SITE_URL", "PATH"]);
});

test("agentEnv はモデル呼び出しに必要なものだけ通し、GitHubの資格情報は渡さない", () => {
  const out = agentEnv({ PATH: "/bin", ANTHROPIC_API_KEY: "k", GITHUB_TOKEN: "g", GH_TOKEN: "g", NPM_TOKEN: "n" });
  assert.equal(out.ANTHROPIC_API_KEY, "k");
  assert.equal(out.GITHUB_TOKEN, undefined);
  assert.equal(out.GH_TOKEN, undefined);
  assert.equal(out.NPM_TOKEN, undefined);
});
