import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {validateAndReduceFeed, syncSignals, FEED_URL, feedStall, fetchFeedWithRetry, nextStatus, runSync, classifyFeedError} from "./fetch-osswatch-signals.mjs";

const base = {
  schema_version:1, generated_at:"2026-10-17T00:40:00Z",
  observations:[{
    repo:"n8n-io/n8n",observed_at:"2026-10-17T00:37:00Z",
    source_url:"https://api.github.com/repos/n8n-io/n8n",
    stars:300,forks:12,archived:false,
    stars_delta_7d:null,baseline_date_7d:null,
    release_status:"ok",latest_stable_release_tag:"v2",
    stable_release_changed_since_previous_snapshot:false,
    signal:"monitoring",observation_count:1,
    raw_json:{secret:"NEVER_PUBLISH"},
  },{
    repo:"external/project",observed_at:"2026-10-17T00:37:00Z",
    source_url:"https://api.github.com/repos/external/project",
    stars:123,forks:3,archived:false,
    stars_delta_7d:null,baseline_date_7d:null,
    release_status:"not_checked",latest_stable_release_tag:null,
    stable_release_changed_since_previous_snapshot:false,
    signal:"monitoring",observation_count:1
  }]
};
const catalog=[{id:"n8n",github_url:"https://github.com/n8n-io/n8n"}];

test("allowlisted exact GitHub matching without leaking upstream fields",()=>{
  const got=validateAndReduceFeed(base,catalog);
  assert.equal(got.observations.length,1);
  assert.equal(got.observations[0].repo,"n8n-io/n8n");
  assert.equal(got.observations[0].stars_delta_7d,null);
  assert.ok(!JSON.stringify(got).includes("NEVER_PUBLISH"));
  assert.ok(!JSON.stringify(got).includes("external/project"));
});

test("unknown catalog, forged API URLs, incorrect releases and false signals fail",()=>{
  for(const change of [
    {source_url:"https://attacker.example/n8n"},
    {stars:-1},
    {release_status:"ok",latest_stable_release_tag:null},
    {signal:"star_growth_7d",stars_delta_7d:null},
    {signal:"archived",archived:false},
    {observed_at:"2030-01-01T00:00:00Z"},
    {stars_delta_7d:35,baseline_date_7d:null},
  ]){
    const payload=structuredClone(base);
    Object.assign(payload.observations[0],change);
    assert.throws(()=>validateAndReduceFeed(payload,catalog),JSON.stringify(change));
  }
});

test("duplicate observation and incompatible schema fail",()=>{
  assert.throws(()=>validateAndReduceFeed({...base,schema_version:3},catalog));
  assert.throws(()=>validateAndReduceFeed({...base,
    observations:[...base.observations,base.observations[0]]},catalog));
});

test("star growth is accepted only with observed baseline and matching signal",()=>{
  const payload=structuredClone(base);
  Object.assign(payload.observations[0],{
    stars_delta_7d:24,baseline_date_7d:"2026-10-10",
    signal:"star_growth_7d",observation_count:7
  });
  assert.equal(validateAndReduceFeed(payload,catalog).observations[0].stars_delta_7d,24);
});

test("sync writes reduced file atomically and never requires paid APIs",async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"osswatch-bridge-"));
  try{
    const source=path.join(root,"catalog.json"),output=path.join(root,"out","signals.json");
    fs.writeFileSync(source,JSON.stringify(catalog));
    const result=await syncSignals({
      catalogPath:source,outPath:output,
      fetcher:async()=>({ok:true,json:async()=>base}),
    });
    assert.equal(result.observations.length,1);
    assert.ok(fs.existsSync(output));
    assert.ok(!fs.readFileSync(output,"utf8").includes("NEVER_PUBLISH"));
    assert.ok(!fs.existsSync(output+".tmp"));
    await assert.rejects(syncSignals({
      catalogPath:source,outPath:output,url:"https://evil.example/feed",
      fetcher:async()=>({ok:true,json:async()=>base})
    }));
  }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test("fetch failures leave the existing artifact untouched",async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"osswatch-bridge-"));
  try{
    const source=path.join(root,"catalog.json"),output=path.join(root,"signals.json");
    fs.writeFileSync(source,JSON.stringify(catalog));
    fs.writeFileSync(output,"{\"keep\":\"last validated data\"}\n");
    await assert.rejects(syncSignals({
      catalogPath:source,outPath:output,
      fetcher:async()=>({ok:false,status:503}),
      retry:{sleep:async()=>{}},
    }));
    assert.match(fs.readFileSync(output,"utf8"),/last validated data/);
  }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test("配信元の更新停止を検知する：36時間以内なら警告なし、超えたら警告（前回と同じ生成日時なら、そのことも書く）",()=>{
  const now=Date.parse("2026-10-19T14:00:00Z");
  assert.equal(feedStall({previousGeneratedAt:"2026-10-19T00:00:00Z",generatedAt:"2026-10-19T00:00:00Z",now}),null);
  assert.equal(feedStall({previousGeneratedAt:"2026-10-17T00:00:00Z",generatedAt:"2026-10-18T10:00:00Z",now}),null); // 28時間
  const same=feedStall({previousGeneratedAt:"2026-10-16T15:53:22Z",generatedAt:"2026-10-16T15:53:22Z",now});
  assert.match(same,/70 時間/);
  assert.match(same,/前回の取り込みと同じ/);
  assert.match(feedStall({previousGeneratedAt:null,generatedAt:"2026-10-16T15:53:22Z",now}),/更新されていません/);
  assert.equal(feedStall({previousGeneratedAt:null,generatedAt:"broken",now}),null);
});

const noSleep={sleep:async()=>{}};

test("transient failures are retried, permanent ones are not",async()=>{
  let n=0;
  const flaky=async()=>{n++; if(n<3) return {ok:false,status:503}; return {ok:true,json:async()=>base};};
  const got=await fetchFeedWithRetry(FEED_URL,{fetcher:flaky,...noSleep});
  assert.equal(got.attempts,3);
  n=0;
  const denied=async()=>{n++; return {ok:false,status:403};};
  await assert.rejects(fetchFeedWithRetry(FEED_URL,{fetcher:denied,...noSleep}),e=>classifyFeedError(e)==="auth"&&e.attempts===1);
  assert.equal(n,1);
  n=0;
  const limited=async()=>{n++; return {ok:false,status:429};};
  await assert.rejects(fetchFeedWithRetry(FEED_URL,{fetcher:limited,...noSleep}),e=>classifyFeedError(e)==="rate_limit"&&e.attempts===3);
  const down=async()=>{throw new TypeError("fetch failed");};
  await assert.rejects(fetchFeedWithRetry(FEED_URL,{fetcher:down,...noSleep}),e=>classifyFeedError(e)==="network");
});

test("status keeps the real last success and counts consecutive failures",()=>{
  const ok=nextStatus(null,{now:Date.parse("2026-10-20T18:00:00Z"),ok:true,feedGeneratedAt:"2026-10-20T17:00:00Z",attempts:2});
  assert.equal(ok.last_success_at,"2026-10-20T18:00:00.000Z");
  assert.equal(ok.consecutive_failures,0);
  const err=Object.assign(new Error("x"),{});
  const f1=nextStatus(ok,{now:Date.parse("2026-10-21T18:00:00Z"),ok:false,error:err});
  const f2=nextStatus(f1,{now:Date.parse("2026-10-22T18:00:00Z"),ok:false,error:new TypeError("fetch failed")});
  assert.equal(f2.last_attempt_at,"2026-10-22T18:00:00.000Z");
  assert.equal(f2.last_success_at,"2026-10-20T18:00:00.000Z");
  assert.equal(f2.consecutive_failures,2);
  assert.equal(f2.error.kind,"network");
  assert.equal(f2.feed_generated_at,"2026-10-20T17:00:00Z");
  // 記録が無い状態から失敗しても、最終成功を推測で埋めない
  const first=nextStatus(null,{now:Date.parse("2026-10-22T18:00:00Z"),ok:false,error:err});
  assert.equal(first.last_success_at,null);
  assert.equal(first.error.kind,"unknown");
});

test("runSync records failures without touching the data file and never leaks raw errors",async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"osswatch-bridge-"));
  try{
    const source=path.join(root,"catalog.json"),output=path.join(root,"signals.json"),status=path.join(root,"status.json");
    fs.writeFileSync(source,JSON.stringify(catalog));
    const okRun=await runSync({catalogPath:source,outPath:output,statusPath:status,now:Date.parse("2026-10-17T01:00:00Z"),
      fetcher:async()=>({ok:true,json:async()=>base})});
    assert.equal(okRun.last_result,"ok");
    const before=fs.readFileSync(output,"utf8");
    const bad=await runSync({catalogPath:source,outPath:output,statusPath:status,now:Date.parse("2026-10-18T01:00:00Z"),
      retry:noSleep,fetcher:async()=>{throw new TypeError("fetch failed token=SECRET");}});
    assert.equal(bad.last_result,"error");
    assert.equal(bad.last_success_at,"2026-10-17T01:00:00.000Z");
    assert.equal(bad.feed_generated_at,base.generated_at);
    assert.equal(fs.readFileSync(output,"utf8"),before);
    assert.ok(!fs.readFileSync(status,"utf8").includes("SECRET"));
    const forged=await runSync({catalogPath:source,outPath:output,statusPath:status,now:Date.parse("2026-10-19T01:00:00Z"),
      fetcher:async()=>({ok:true,json:async()=>({...base,schema_version:2})})});
    assert.equal(forged.error.kind,"invalid_feed");
    assert.equal(forged.consecutive_failures,2);
  }finally{fs.rmSync(root,{recursive:true,force:true})}
});
