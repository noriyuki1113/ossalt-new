/** 品質監査ダッシュボード（1枚の静的HTML。外部の読み込みなし。ローカルで開く） */
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function renderDashboard({ summary: s, pages, diff, previousAuditId }) {
  const rows = pages.map((p) => ({
    id: p.id, name: p.name, url: p.url, state: p.auditState, grade: p.grade ?? (p.auditState === "audited" ? "未評価" : "未監査"), score: p.score ?? null,
    status: p.status ?? null, coverage: p.coverage ?? null, priority: p.priority ?? "—", reason: p.priorityReason ?? p.reason ?? "",
    warnings: (p.warnings ?? []).map((w) => `[${w.severity}] ${w.message}`), severity: (p.warnings ?? []).some((w) => w.severity === "high") ? "high" : (p.warnings ?? []).some((w) => w.severity === "medium") ? "medium" : (p.warnings ?? []).length ? "low" : "",
    fails: (p.criteria ?? []).filter((c) => c.status === "fail").map((c) => `${c.id} ${c.label}`), unknown: (p.criteria ?? []).filter((c) => c.status === "unknown").map((c) => c.id),
    sources: p.sources ?? [], verifiedAt: p.verifiedAt, fix: p.fix?.status ?? "", impressions: p.gsc?.impressions ?? null,
  }));
  const card = (label, v, sub = "") => `<div class="card"><div class="lbl">${esc(label)}</div><div class="val">${esc(v)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}</div>`;
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OSSALT 品質監査</title>
<style>
:root{--bg:#f6f7f4;--card:#fff;--ink:#14181c;--ink2:#4e5860;--rule:#d6dad2;--a:#2f6b4a;--b:#1d3b72;--c:#8a5d00;--d:#b73a24;--chip:#eef0ea}
@media (prefers-color-scheme:dark){:root{--bg:#121416;--card:#1b1e21;--ink:#e8ebe6;--ink2:#a7afb5;--rule:#30353a;--a:#7fc29d;--b:#9db8ef;--c:#e2b45c;--d:#f08c77;--chip:#24282c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.6 system-ui,-apple-system,"Hiragino Sans","Yu Gothic",sans-serif}
main{max-width:1200px;margin:0 auto;padding:16px}h1{font-size:1.3rem;margin:.2rem 0}.muted{color:var(--ink2);font-size:.8rem}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:12px 0}.card{background:var(--card);border:1px solid var(--rule);border-radius:8px;padding:8px 10px}
.lbl{font-size:.75rem;color:var(--ink2)}.val{font-size:1.3rem;font-weight:700}.sub{font-size:.7rem;color:var(--ink2)}
.tools{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.tools input,.tools select{font:inherit;padding:6px 8px;border:1px solid var(--rule);border-radius:6px;background:var(--card);color:var(--ink)}.tools input{flex:1 1 220px}
.wrap{overflow-x:auto;background:var(--card);border:1px solid var(--rule);border-radius:8px}table{border-collapse:collapse;width:100%;min-width:900px}th,td{padding:6px 8px;border-bottom:1px solid var(--rule);text-align:left;vertical-align:top}
th{position:sticky;top:0;background:var(--card);cursor:pointer;font-size:.8rem;white-space:nowrap}td{font-size:.8rem}.g{font-weight:700}.gA{color:var(--a)}.gB{color:var(--b)}.gC{color:var(--c)}.gD{color:var(--d)}
.sev-high{color:var(--d);font-weight:700}.sev-medium{color:var(--c)}ul{margin:0;padding-left:1rem}a{color:var(--b)}details{margin-top:2px}
</style></head><body><main>
<h1>OSSALT 品質監査ダッシュボード</h1>
<p class="muted">監査ID ${esc(s.auditId)}／${esc(s.generatedAt)}／基準 ${esc(s.rulesVersion)}／データ取得 ${esc(s.dataBuiltAt ?? "不明")}${previousAuditId ? `／前回 ${esc(previousAuditId)}` : ""}</p>
<div class="cards">
${card("詳細ページ数", s.target)}${card("監査完了", s.audited)}${card("未監査・失敗", s.notAudited + s.failed)}
${card("A", s.grades.A)}${card("B", s.grades.B)}${card("C", s.grades.C)}${card("D", s.grades.D)}${card("未評価", s.grades.unrated, `暫定 ${s.provisional}`)}
${card("重大な警告", s.severeWarnings)}${card("解説の重複", s.duplicateContent)}${card("独自解説なし", s.noGuide)}
${card("改善待ち", s.fixes.pending)}${card("修正済み", s.fixes.done)}
${diff ? card("前回比", `改善 ${diff.improved.length}／悪化 ${diff.worsened.length}`, `入力の変更 ${diff.changedInput.length}件`) : card("前回比", "—", "前回の監査なし")}
</div>
<p class="muted">点数は、確認できた項目だけで計算しています（「未確認」は0点ではありません）。「暫定」は確認できた割合が80%未満、「未評価」は50%未満です。共通テンプレートの表示検査：${esc(s.ux.status)}（${esc(s.ux.note)}）</p>
<div class="tools"><input id="q" placeholder="OSS名・問題で検索"><select id="fg"><option value="">評価：すべて</option><option>A</option><option>B</option><option>C</option><option>D</option><option>未評価</option><option>未監査</option></select>
<select id="fp"><option value="">優先度：すべて</option><option>P0</option><option>P1</option><option>P2</option><option>P3</option></select><select id="fs"><option value="">重大度：すべて</option><option value="high">重大</option><option value="medium">中</option><option value="low">軽微</option></select></div>
<div class="wrap"><table><thead><tr><th data-k="name">OSS</th><th data-k="score">点数</th><th data-k="grade">評価</th><th data-k="coverage">確実性</th><th data-k="priority">優先度</th><th>問題・改善の手がかり</th><th data-k="verifiedAt">出典・最終確認</th><th data-k="fix">修正状況</th>${rows.some((r) => r.impressions != null) ? '<th data-k="impressions">表示回数</th>' : ""}</tr></thead><tbody id="tb"></tbody></table></div>
<p class="muted">表示回数は、手元の Search Console のCSVがある場合だけ表示します（Gitには保存しません）。</p>
<script>
const R=${JSON.stringify(rows).replace(/</g, "\\u003c")};const showImp=R.some(r=>r.impressions!=null);let key="priority",asc=true;
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function draw(){const kw=q.value.toLowerCase(),g=fg.value,p=fp.value,sv=fs.value;
let rs=R.filter(r=>(!g||r.grade===g)&&(!p||r.priority===p)&&(!sv||r.severity===sv)&&(!kw||(r.name+r.id+r.warnings.join()+r.fails.join()+r.reason).toLowerCase().includes(kw)));
rs.sort((a,b)=>{const x=a[key]??"",y=b[key]??"";return (x>y?1:x<y?-1:0)*(asc?1:-1)});
tb.innerHTML=rs.map(r=>"<tr><td><a href='https://ossalt.jp"+r.url+"'>"+esc(r.name)+"</a><div class=muted>"+esc(r.id)+"</div></td><td>"+(r.score??"—")+"</td><td class='g g"+esc(r.grade)+"'>"+esc(r.grade)+"</td><td>"+(r.coverage==null?"—":Math.round(r.coverage*100)+"%")+(r.status==="provisional"?"<div class=muted>暫定</div>":"")+"</td><td>"+esc(r.priority)+"<div class=muted>"+esc(r.reason)+"</div></td><td>"+(r.warnings.length?"<ul>"+r.warnings.map(w=>"<li class='sev-"+(w.startsWith("[high]")?"high":w.startsWith("[medium]")?"medium":"")+"'>"+esc(w)+"</li>").join("")+"</ul>":"")+(r.fails.length?"<details><summary>不足 "+r.fails.length+"件</summary><ul>"+r.fails.map(f=>"<li>"+esc(f)+"</li>").join("")+"</ul></details>":"")+(r.unknown.length?"<div class=muted>未確認："+esc(r.unknown.join(" "))+"</div>":"")+"</td><td>"+(r.sources.length?r.sources.map(u=>"<a href='"+esc(u)+"'>"+esc(new URL(u).hostname)+"</a>").join("<br>"):"<span class=muted>未検証</span>")+(r.verifiedAt?"<div class=muted>"+esc(r.verifiedAt)+"</div>":"")+"</td><td>"+esc(r.fix||"—")+"</td>"+(showImp?"<td>"+(r.impressions??"—")+"</td>":"")+"</tr>").join("");}
for(const el of [q,fg,fp,fs])el.addEventListener("input",draw);document.querySelectorAll("th[data-k]").forEach(th=>th.addEventListener("click",()=>{const k=th.dataset.k;asc=key===k?!asc:true;key=k;draw()}));draw();
</script></main></body></html>`;
}
