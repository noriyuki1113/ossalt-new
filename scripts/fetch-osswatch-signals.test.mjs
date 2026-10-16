import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {validateAndReduceFeed, syncSignals, FEED_URL} from "./fetch-osswatch-signals.mjs";

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
    }));
    assert.match(fs.readFileSync(output,"utf8"),/last validated data/);
  }finally{fs.rmSync(root,{recursive:true,force:true})}
});
