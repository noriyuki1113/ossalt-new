import { test } from "node:test";
import assert from "node:assert/strict";
import { buildActivityReport, activityDateJst } from "./watch-changes.ts";
import type { WatchSignalFeed, WatchSignal } from "./watch-signals.ts";

const now = new Date("2026-10-17T01:00:00Z");
const tools = [
  {id:"n8n",name:"n8n",github_url:"https://github.com/n8n-io/n8n",primary_competitor:"Zapier",category:"automation"},
  {id:"ollama",name:"Ollama",github_url:"https://github.com/ollama/ollama",primary_competitor:"ChatGPT",category:"ai"},
  {id:"decoy",name:"Fake Repo",github_url:"https://evil.example/n8n-io/n8n",primary_competitor:"Unknown",category:"other"},
];
function record(repo: string, extras: Partial<WatchSignal> = {}): WatchSignal {
  return {
    repo, observed_at:"2026-10-16T23:00:00Z",
    source_url:"https://api.github.com/repos/" + repo,
    stars:200,forks:10,archived:false,stars_delta_7d:null,
    baseline_date_7d:null,release_status:"ok",
    latest_stable_release_tag:"v1.0",stable_release_changed_since_previous_snapshot:false,
    signal:"monitoring",observation_count:1,...extras
  };
}
function feed(...obs: WatchSignal[]): WatchSignalFeed {
  return {schema_version:1,generated_at:"2026-10-17T00:00:00Z",observations:obs};
}

test("first observation is monitoring with unknown baselines, not zero growth",()=>{
  const result=buildActivityReport(tools,feed(record("n8n-io/n8n")),now);
  assert.equal(result.rows.length,1);
  assert.equal(result.changed,0);
  assert.equal(result.with7dBaseline,0);
  assert.equal(result.rows[0].severity,"observing");
  assert.equal(result.rows[0].observation.stars_delta_7d,null);
});

test("verified current release-change is highlighted but stale events never are",()=>{
  const result=buildActivityReport(tools,feed(
    record("n8n-io/n8n",{
      signal:"stable_release_change_observed",
      stable_release_changed_since_previous_snapshot:true,
      stars_delta_7d:20,baseline_date_7d:"2026-10-10"
    }),
    record("ollama/ollama",{
      signal:"archived",archived:true,observed_at:"2026-10-01T11:00:00Z",
    })
  ),now);
  assert.equal(result.rows.length,2);
  assert.equal(result.changed,1);
  assert.equal(result.stale,1);
  assert.equal(result.with7dBaseline,1);
  assert.equal(result.rows[0].tool.id,"n8n");
  assert.equal(result.rows[0].severity,"changed");
  assert.equal(result.rows[1].severity,"observing");
  assert.match(result.rows[1].headline,/古い/);
});

test("current archived observations come first",()=>{
  const result=buildActivityReport(tools,feed(
    record("n8n-io/n8n",{signal:"stable_release_change_observed",
      stable_release_changed_since_previous_snapshot:true}),
    record("ollama/ollama",{signal:"archived",archived:true})
  ),now);
  assert.deepEqual(result.rows.map(r=>r.tool.id),["ollama","n8n"]);
  assert.equal(result.rows[0].severity,"attention");
});

test("unmatched, forged, invalid, and future observations are excluded",()=>{
  const result=buildActivityReport(tools,feed(
    record("n8n-io/n8n",{source_url:"https://attacker.example/fake"}),
    record("ollama/ollama",{observed_at:"2026-12-01T00:00:00Z"}),
    record("bad/match",{stars:42})
  ),now);
  assert.equal(result.rows.length,0);
  assert.equal(result.changed,0);
});

test("missing and unsupported feeds produce honest empty report",()=>{
  assert.deepEqual(buildActivityReport(tools,null,now).rows,[]);
  assert.deepEqual(buildActivityReport(tools,{schema_version:2,generated_at:now.toISOString(),
    observations:[]},now).rows,[]);
  assert.equal(activityDateJst("not a date"),"未確認");
});

test("履歴蓄積中の行には、OSSALT自身の記録による増加を別の出典として添える（Watch の値は書き換えない）",()=>{
  const withGain=[{...tools[0],star_gain:{gain:123,days:24,from:"2026-09-25"}}];
  const result=buildActivityReport(withGain,feed(record("n8n-io/n8n")),now);
  assert.deepEqual(result.rows[0].ownGain,{gain:123,days:24,from:"2026-09-25"});
  assert.equal(result.rows[0].observation.stars_delta_7d,null); // Watch の値はそのまま（null）
  assert.equal(result.with7dBaseline,0);
  // Watch に7日間の値があるときは、OSSALT記録は添えない
  const real=buildActivityReport(withGain,feed(record("n8n-io/n8n",{stars_delta_7d:5,baseline_date_7d:"2026-10-10"})),now);
  assert.equal(real.rows[0].ownGain,null);
  // 記録が無い・減少（gain < 0）のときも添えない
  assert.equal(buildActivityReport([{...tools[0],star_gain:null}],feed(record("n8n-io/n8n")),now).rows[0].ownGain,null);
  assert.equal(buildActivityReport([{...tools[0],star_gain:{gain:-1,days:5,from:"2026-10-01"}}],feed(record("n8n-io/n8n")),now).rows[0].ownGain,null);
});

test("配信元の更新停止：生成日時が36時間より古ければ検知し、観測回数が1のままなら履歴が積み上がっていないと示す",()=>{
  const fresh=buildActivityReport(tools,feed(record("n8n-io/n8n")),now); // 生成から1時間
  assert.equal(fresh.feedStalled,false);
  assert.equal(fresh.historyNotAccumulating,false);
  const later=new Date("2026-10-19T14:00:00Z"); // 生成から62時間
  const stalled=buildActivityReport(tools,feed(record("n8n-io/n8n",{observed_at:"2026-10-16T00:00:00Z"})),later); // 観測から86時間
  assert.equal(stalled.feedStalled,true);
  assert.equal(stalled.historyNotAccumulating,true);
  assert.equal(stalled.rows[0].outdated,true); // 古い観測は「現在の変化」として扱わない（従来どおり）
  const growing=buildActivityReport(tools,feed(record("n8n-io/n8n",{observed_at:"2026-10-17T00:00:00Z",observation_count:3})),later);
  assert.equal(growing.historyNotAccumulating,false);
  assert.equal(buildActivityReport(tools,null,later).feedStalled,false); // データなしは別の表示（NO VERIFIED DATA）
});
