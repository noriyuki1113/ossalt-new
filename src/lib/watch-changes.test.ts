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
