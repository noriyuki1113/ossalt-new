# Cloudflare で動くOSSの掲載候補（自動収集）

このファイルは `scripts/discover-cloudflare.mjs` が作ります。**ここに載っていても、サイトには公開されません。**
掲載するかは人が決め、「ツール追加」ワークフローで追加します（手順：docs/discovery/CLOUDFLARE_DISCOVERY.md）。

状態の意味：verified＝プロジェクト自身の設定ファイルで確認／api＝GitHub API／claimed＝第三者の一覧の記載／unknown＝未確認（「非対応」ではない）

- 候補 189件（新規 189件・掲載済み 0件）
- 審査待ち 173件・公開できない問題あり 16件・掲載済みで差分あり 0件
- 設定ファイルで機能を確認できた 122件・GitHub API で補完 0件

## 審査待ち（新規）

| プロジェクト | ライセンス | Cloudflare の機能 | Workers Paid | 確認が必要な点 |
|---|---|---|---|---|
| [EmailFlare](https://github.com/0xdps/emailflare) | MIT（claimed） | cron, d1, durable_objects, email_routing, kv, queues, r2（claimed） | 要 | needs_workers_paid, has_extra_requirements |
| [edgeKey](https://github.com/34892002/edgekey) | MIT（claimed） | cron, d1（verified） | 不要 | — |
| [r2-webdav](https://github.com/abersheeran/r2-webdav) | Apache-2.0（claimed） | r2（verified） | 不要 | — |
| [Cloudbox](https://github.com/acoyfellow/cloudbox) | MIT（claimed） | d1, durable_objects, r2, workers_ai（verified） | 未確認 | — |
| [Cloudshell](https://github.com/acoyfellow/cloudshell) | MIT（claimed） | d1, durable_objects, kv, r2, workers_ai（claimed） | 未確認 | — |
| [turborepo-remote-cache-cloudflare](https://github.com/adirishi/turborepo-remote-cache-cloudflare) | MIT（claimed） | cron, r2（verified） | 不要 | — |
| [CForum](https://github.com/adysec/cforum) | AGPL-3.0（claimed） | d1, r2（verified） | 未確認 | — |
| [Skland Daily Attendance](https://github.com/aetherside/skland-daily-attendance) | MIT（claimed） | cron, kv（verified） | 不要 | — |
| [hostc](https://github.com/akazwz/hostc) | Apache-2.0（claimed） | durable_objects（claimed） | 未確認 | — |
| [blobatar API](https://github.com/alain00/blobatar) | MIT（claimed） | —（unknown） | 不要 | cloudflare_bindings_unverified |
| [Larafeed](https://github.com/angristan/larafeed) | MIT（claimed） | cron, d1, kv, queues, workers_ai（verified） | 不要 | — |
| [EdgeChat](https://github.com/aozorae/edgechat) | GPL-3.0-or-later（claimed） | cron, d1, durable_objects, kv, r2（claimed） | 不要 | — |
| [AwaitStep](https://github.com/awaitstep/awaitstep) | Apache-2.0（claimed） | d1, durable_objects（claimed） | 未確認 | — |
| [Memory Note](https://github.com/azu/memory-note) | MIT（claimed） | kv（verified） | 不要 | — |
| [rdyrct](https://github.com/baronunread/rdyrct) | MIT（claimed） | cron, d1, durable_objects, kv, queues, r2, workflows（verified） | 不要 | — |
| [MoeMail](https://github.com/beilunyang/moemail) | MIT（claimed） | d1, kv（claimed） | 未確認 | — |
| [Counterscale](https://github.com/benvinegar/counterscale) | MIT（claimed） | analytics_engine, cron, r2（claimed） | 不要 | — |
| [CiVideo](https://github.com/bitoceango/civideo) | MIT（claimed） | d1, r2（claimed） | 不要 | — |
| [FormZero](https://github.com/bohdanpetryshyn/formzero) | MIT（claimed） | d1（verified） | 不要 | — |
| [RSSHub Never Die](https://github.com/caomeiyouren/rsshub-never-die) | MIT（claimed） | （verified） | 不要 | — |
| [Punctual](https://github.com/cccrafts/punctual) | MIT（claimed） | analytics_engine, cron, d1, durable_objects, kv, queues, r2（verified） | 不要 | — |
| [placeholders.dev](https://github.com/cherry/placeholders.dev) | MIT（claimed） | （verified） | 不要 | — |
| [SaaSMail](https://github.com/choyiny/saasmail) | Apache-2.0（claimed） | cron, d1, durable_objects, email_routing, queues, r2（claimed） | 未確認 | — |
| [Folia](https://github.com/chthollyphile/folia-major) | AGPL-3.0-only（claimed） | （verified） | 不要 | — |
| [Agentic Inbox](https://github.com/cloudflare/agentic-inbox) | Apache-2.0（claimed） | durable_objects, email_routing, r2, workers_ai（verified） | 不要 | has_extra_requirements |
| [Cloudflare OS](https://github.com/cloudflare/cloudflare-os) | Apache-2.0（claimed） | （verified） | 要 | needs_workers_paid, has_extra_requirements |
| [Cloudflare Prometheus Exporter](https://github.com/cloudflare/cloudflare-prometheus-exporter) | MIT（claimed） | durable_objects, kv（verified） | 不要 | — |
| [MPP Payment-Gated Proxy](https://github.com/cloudflare/mpp-proxy) | Apache-2.0（claimed） | （verified） | 不要 | — |
| [Cloudflare Playwright MCP](https://github.com/cloudflare/playwright-mcp) | Apache-2.0（claimed） | browser_rendering, durable_objects（claimed） | 不要 | has_extra_requirements |
| [VibeSDK](https://github.com/cloudflare/vibesdk) | MIT（claimed） | browser_rendering, d1, durable_objects, kv, r2, workers_ai（verified） | 未確認 | — |
| [Cloudflarebase](https://github.com/cloudflarebase/cloudflarebase) | Apache-2.0（claimed） | d1, kv, workers_ai（verified） | 不要 | has_extra_requirements |
| [Open Artifacts](https://github.com/coda0hq/open-artifacts) | MIT（claimed） | d1, r2（verified） | 不要 | — |
| [Bark Worker](https://github.com/cwxiaos/bark-worker) | GPL-3.0-only（claimed） | d1（verified） | 不要 | — |
| [Seeder](https://github.com/danielsyauqi/seeder) | MIT（claimed） | d1, r2（verified） | 要 | needs_workers_paid |
| [atalaya](https://github.com/dcarrillo/atalaya) | Apache-2.0（claimed） | cron, d1, durable_objects（claimed） | 不要 | — |
| [minshop](https://github.com/ddyy/minshop) | MIT（claimed） | cron, d1, r2（verified） | 不要 | — |
| [minvoice](https://github.com/ddyy/minvoice) | MIT（claimed） | cron, d1（verified） | 不要 | has_extra_requirements |
| [ripgit](https://github.com/deathbyknowledge/ripgit) | AGPL-3.0（claimed） | durable_objects, kv（verified） | 未確認 | — |
| [Nodrix](https://github.com/decoded-cipher/nodrix) | MIT（claimed） | cron, d1, durable_objects, kv, r2, workflows（verified） | 不要 | — |
| [ShotSync](https://github.com/defiabell/shotsync) | MIT（claimed） | r2（verified） | 不要 | — |
| [yixi](https://github.com/defiabell/yixi) | MIT（claimed） | cron, d1（verified） | 未確認 | — |
| [Codra](https://github.com/devarshishimpi/codra) | AGPL-3.0（claimed） | cron, hyperdrive, kv, queues, workers_ai, workflows（claimed） | 未確認 | — |
| [Discohook](https://github.com/discohook/discohook) | AGPL-3.0（claimed） | durable_objects, hyperdrive（claimed） | 未確認 | — |
| [Quickinbox](https://github.com/divinprince/quickinbox) | MIT（claimed） | d1, email_routing, r2, workers_ai（verified） | 不要 | — |
| [Cloudflare Temp Email](https://github.com/dreamhunter2333/cloudflare_temp_email) | MIT（claimed） | cron, d1, email_routing, kv, workers_ai（claimed） | 未確認 | — |
| [RepoAccess](https://github.com/edgekits/repoaccess-core) | AGPL-3.0（claimed） | durable_objects, kv, workflows（claimed） | 未確認 | — |
| [EmDash](https://github.com/emdash-cms/emdash) | MIT（claimed） | cron, d1, images, kv, r2（claimed） | 不要 | — |
| [Doota](https://github.com/ethercorps/doota) | Apache-2.0（claimed） | cron, d1, durable_objects, email_routing, kv, queues, r2（claimed） | 未確認 | — |
| [Firefly III MCP](https://github.com/etnperlong/firefly-iii-mcp) | MIT（claimed） | durable_objects（claimed） | 不要 | — |
| [OpenSEO](https://github.com/every-app/open-seo) | MIT（claimed） | cron, d1, durable_objects, kv, r2, workflows（verified） | 不要 | has_extra_requirements |
| [Davflare](https://github.com/fanchenggang/davflare) | MIT（claimed） | r2（verified） | 未確認 | — |
| [Screendrop Cloud](https://github.com/fayazara/screendrop) | MIT（claimed） | d1, r2（claimed） | 不要 | — |
| [KISS Worker](https://github.com/fishjar/kiss-worker) | MIT（claimed） | durable_objects, kv（verified） | 不要 | — |
| [Email Explorer](https://github.com/g4brym/email-explorer) | MIT（claimed） | durable_objects, email_routing, r2（claimed） | 不要 | has_extra_requirements |
| [R2 Explorer](https://github.com/g4brym/r2-explorer) | MIT（claimed） | access, r2（claimed） | 不要 | has_extra_requirements |
| [workers-firecrawl](https://github.com/g4brym/workers-firecrawl) | MIT（claimed） | browser_rendering（verified） | 不要 | has_extra_requirements |
| [Mailysend](https://github.com/gagndeep/mailysend) | MIT（claimed） | analytics_engine, cron, d1, durable_objects, email_routing, kv, queues, r2（claimed） | 未確認 | — |
| [GMShop Edge](https://github.com/gmwalletapp/gmshop-edge) | GPL-3.0-or-later（claimed） | cron, d1, email_routing, kv, queues, r2（verified） | 要 | needs_workers_paid |
| [Exception-Notify workspace](https://github.com/guangyiding/exception-notify) | Apache-2.0（claimed） | d1, kv（claimed） | 不要 | — |
| [ternssh](https://github.com/haradakashiwa/ternssh) | GPL-3.0-or-later（claimed） | d1, durable_objects（verified） | 不要 | has_extra_requirements |
| [loginbase](https://github.com/harlonwang/loginbase) | MIT（claimed） | d1, kv（verified） | 未確認 | — |
| [Reminal](https://github.com/harshalgajjar/reminal) | AGPL-3.0-or-later（claimed） | durable_objects（claimed） | 不要 | — |
| [Edgemetry](https://github.com/hayaran/edgemetry) | MIT（claimed） | cron, d1（verified） | 不要 | — |
| [Collection Down](https://github.com/heartalborada-del/collection-down) | MIT（claimed） | （verified） | 不要 | — |
| [AndroMeld TURN Relay](https://github.com/heruoxin/webrtc_turn) | GPL-3.0-or-later（claimed） | —（unknown） | 不要 | cloudflare_bindings_unverified |
| [Heyo Docs](https://github.com/heyo-sh/heyo-docs) | MIT（claimed） | —（unknown） | 未確認 | cloudflare_bindings_unverified |
| [MailFlare](https://github.com/hieunc229/mailflare) | AGPL-3.0-or-later（claimed） | cron, d1, durable_objects, email_routing, queues, r2, workers_ai（verified） | 要 | needs_workers_paid, has_extra_requirements |
| [Tempik](https://github.com/hirotomasato/tempik) | MIT（claimed） | d1（verified） | 不要 | has_extra_requirements |
| [Synch](https://github.com/hjinco/synch) | MIT（claimed） | cron, d1, durable_objects, email_routing, queues, r2（claimed） | 不要 | — |
| [usage-guard-collector](https://github.com/howardzlh/usage-guard-collector) | MIT（claimed） | cron, d1（verified） | 不要 | — |
| [HQBase](https://github.com/hqbase/hqbase) | AGPL-3.0-only（claimed） | cron, d1, durable_objects, email_routing, queues, r2（verified） | 要 | needs_workers_paid, has_extra_requirements |
| [CF Server Monitor](https://github.com/huilang-me/cf-server-monitor) | MIT（claimed） | cron, d1, durable_objects（verified） | 不要 | — |
| [Free4Chat](https://github.com/i365dev/free4chat) | MIT（claimed） | cron, durable_objects, kv（claimed） | 未確認 | — |
| [LetterDrop](https://github.com/i365dev/letterdrop) | MIT（claimed） | d1, kv, queues, r2, workers_ai（claimed） | 未確認 | — |
| [OpenShort.link](https://github.com/idhamsy/openshortlink) | AGPL-3.0-only（claimed） | analytics_engine, cron, d1, kv（verified） | 不要 | has_extra_requirements |
| [Freemail](https://github.com/idinging/freemail) | Apache-2.0（claimed） | d1, r2（verified） | 不要 | has_extra_requirements |
| [RenewHelper](https://github.com/ieax/renewhelper) | MIT（claimed） | cron, kv（verified） | 不要 | — |
| [typedwebhook.tools](https://github.com/inngest/typedwebhook.tools) | GPL-3.0（claimed） | durable_objects, kv（verified） | 未確認 | — |
| [screencapture Live](https://github.com/itschip/screencapture) | AGPL-3.0-only（claimed） | durable_objects（claimed） | 不要 | — |
| [isupmap](https://github.com/jaironlanda/isupmap) | MIT（claimed） | analytics_engine, cron, d1, kv, queues（verified） | 不要 | has_extra_requirements |
| [Jant](https://github.com/jant-me/jant) | AGPL-3.0-or-later（claimed） | d1, r2（claimed） | 不要 | — |
| [Token Monitor Hub](https://github.com/javis603/token-monitor) | MIT（claimed） | durable_objects（claimed） | 不要 | — |
| [Last.fm Recently Played](https://github.com/jeffreyca/lastfm-recently-played-readme) | MIT（claimed） | （verified） | 不要 | — |
| [Jina AI MCP Server](https://github.com/jina-ai/mcp) | Apache-2.0（claimed） | （verified） | 不要 | — |
| [paje](https://github.com/jonesphillip/paje) | Apache-2.0（claimed） | durable_objects（verified） | 未確認 | — |
| [ShareHTML](https://github.com/jonesphillip/sharehtml) | Apache-2.0（claimed） | access, durable_objects, r2（claimed） | 不要 | has_extra_requirements |
| [Weft](https://github.com/jonesphillip/weft) | Apache-2.0（claimed） | durable_objects, workflows（verified） | 未確認 | — |
| [YAOS](https://github.com/kavinsood/yaos) | 0BSD（claimed） | durable_objects, r2（claimed） | 不要 | — |
| [Garrul](https://github.com/kingpin/garrul) | Apache-2.0（claimed） | analytics_engine, cron, d1, durable_objects, kv, workers_ai（claimed） | 不要 | has_extra_requirements |
| [Dispoflare](https://github.com/leocolomb/dispoflare) | MIT（claimed） | cron（verified） | 不要 | has_extra_requirements |
| [CloudPaste](https://github.com/ling-drag0n/cloudpaste) | Apache-2.0（claimed） | cron, d1, workflows（claimed） | 未確認 | — |
| [Feedlog](https://github.com/linkcraftstudio/feedlog) | MIT（claimed） | cron, hyperdrive, queues, r2（verified） | 不要 | — |
| [durable-git](https://github.com/littledivy/durable-git) | MIT（claimed） | durable_objects, r2（verified） | 要 | needs_workers_paid |
| [wx2md](https://github.com/loadchange/wx2md-worker) | MIT（claimed） | r2, workers_ai（verified） | 不要 | has_extra_requirements |
| [Deepcrawl](https://github.com/lumpinif/deepcrawl) | MIT（claimed） | browser_rendering, d1, durable_objects, kv, queues, r2, workers_ai（claimed） | 不要 | — |
| [UptimeFlare](https://github.com/lyc8503/uptimeflare) | Apache-2.0（claimed） | d1（verified） | 未確認 | — |
| [Cloud Mail](https://github.com/maillab/cloud-mail) | MIT（claimed） | cron, d1, email_routing, kv, r2, workers_ai（claimed） | 未確認 | — |
| [Auto Reaction Bot](https://github.com/malith-rukshan/auto-reaction-bot) | MIT（claimed） | （verified） | 不要 | — |
| [Cloudflare ImgBed](https://github.com/marseventh/cloudflare-imgbed) | MIT（claimed） | d1, images, kv, r2（claimed） | 不要 | — |
| [md.page](https://github.com/maypaz/md.page) | MIT（claimed） | analytics_engine, kv, r2（claimed） | 不要 | has_extra_requirements |
| [Cut](https://github.com/mendylanda/cut) | MIT（claimed） | kv（verified） | 不要 | — |
| [Sink](https://github.com/miantiao-me/sink) | AGPL-3.0-only（claimed） | analytics_engine, cron, d1, kv, r2, workers_ai（verified） | 不要 | has_extra_requirements |
| [OmniMail](https://github.com/mibgb65-cloud/omnimail) | MIT（claimed） | cron, d1, queues, r2, workers_ai, workflows（verified） | 不要 | has_extra_requirements |
| [microfeed](https://github.com/microfeed/microfeed) | AGPL-3.0-only（claimed） | cron, d1, queues, r2（verified） | 不要 | — |
| [MailClaw](https://github.com/missuo/mailclaw) | MIT（claimed） | d1, email_routing, r2（verified） | 不要 | has_extra_requirements |
| [ni-mail](https://github.com/mskatoni/ni-mail) | Apache-2.0（claimed） | （verified） | 不要 | has_extra_requirements |
| [Wormhole](https://github.com/muhammadhananasghar/wormhole) | MIT（claimed） | d1, durable_objects（claimed） | 未確認 | — |
| [Bookshelf](https://github.com/murerkinn/bookshelf) | MIT（claimed） | r2（claimed） | 不要 | — |
| [CloudSSH](https://github.com/newbietan/cloudssh) | Apache-2.0（claimed） | durable_objects（verified） | 不要 | — |
| [Cloudsail](https://github.com/nkzw-tech/cloudsail) | MIT（claimed） | durable_objects（verified） | 未確認 | — |
| [BinThere](https://github.com/nxfu/binthere) | MIT（claimed） | durable_objects, kv（verified） | 不要 | — |
| [shrtnr](https://github.com/oddbit/shrtnr) | Apache-2.0（claimed） | d1, durable_objects, kv（verified） | 不要 | — |
| [vmail](https://github.com/oiov/vmail) | GPL-3.0（claimed） | cron, d1, email_routing（verified） | 未確認 | — |
| [fxTikTok](https://github.com/okdargy/fxtiktok) | MIT（claimed） | （verified） | 不要 | — |
| [Monolith](https://github.com/one-ea/monolith) | MIT（claimed） | analytics_engine, cron, d1, r2（claimed） | 未確認 | — |
| [Cloudflare Clist](https://github.com/ooyyh/cloudflare-clist) | MIT（claimed） | d1（claimed） | 不要 | — |
| [Rin](https://github.com/openrin/rin) | MIT（claimed） | —（unknown） | 未確認 | cloudflare_bindings_unverified |
| [OpenStory](https://github.com/openstory-so/openstory) | MIT（claimed） | cron, d1, durable_objects, email_routing, r2, workflows（verified） | 要 | needs_workers_paid, has_extra_requirements |
| [scrapedown](https://github.com/ozanvos/scrapedown) | MIT（claimed） | （verified） | 不要 | — |
| [Ownlist](https://github.com/pfstr/ownlist) | MIT（claimed） | cron, d1（verified） | 未確認 | — |
| [StatusBeam](https://github.com/pleaseai/statusbeam) | MIT（claimed） | cron, d1, images, kv, queues（claimed） | 不要 | — |
| [Glance](https://github.com/plivo-labs/glance) | MIT（claimed） | cron, d1, durable_objects, kv, r2, workers_ai（claimed） | 不要 | has_extra_requirements |
| [nabiz](https://github.com/productdevbook/nabiz) | MIT（claimed） | cron, d1（verified） | 不要 | — |
| [cindermail](https://github.com/psalm2517/cindermail) | MIT（claimed） | cron, d1（verified） | 未確認 | — |
| [OpenAI Gemini](https://github.com/publicaffairs/openai-gemini) | MIT（claimed） | （verified） | 不要 | — |
| [Second Brain for AI](https://github.com/rahilp/second-brain-cloudflare) | MIT（claimed） | cron, d1, kv, vectorize, workers_ai（verified） | 不要 | has_extra_requirements |
| [InsightFlare](https://github.com/ravelloh/insightflare) | MIT（claimed） | analytics_engine, cron, d1, durable_objects, kv（verified） | 不要 | has_extra_requirements |
| [FlareMo](https://github.com/realchendahuang/flaremo) | AGPL-3.0-only（claimed） | cron, d1, queues, r2, vectorize, workers_ai（verified） | 不要 | has_extra_requirements |
| [RedwoodSDK Invoices](https://github.com/redwoodjs/invoices) | MIT（claimed） | durable_objects, r2（verified） | 未確認 | — |
| [Browser Relay Hub](https://github.com/reliefeai/browser-relay) | MIT（claimed） | durable_objects（claimed） | 不要 | — |
| [Holocron](https://github.com/remorses/holocron) | MIT（claimed） | d1, durable_objects, email_routing, kv, workers_ai（claimed） | 未確認 | — |
| [Cloudflare Analytics Explorer](https://github.com/rohanprasadofficial/cloudflare-analytics-explorer) | MIT（claimed） | （verified） | 不要 | — |
| [roim-picx](https://github.com/roimdev/roim-picx) | Apache-2.0（claimed） | d1, kv, r2（claimed） | 未確認 | — |
| [LLM API Proxy](https://github.com/rxliuli/llm-api-proxy) | GPL-3.0-only（claimed） | （verified） | 不要 | — |
| [kukuroo](https://github.com/saiday/kukuroo) | MIT（claimed） | kv（claimed） | 不要 | — |
| [Forja](https://github.com/santmun/forja) | MIT（claimed） | cron, d1, durable_objects, r2, vectorize, workers_ai（verified） | 未確認 | — |
| [cftgsx](https://github.com/scshirker/cftgsx) | MIT（claimed） | （verified） | 不要 | — |
| [Semantic Search](https://github.com/semanticsearch-ai/semanticsearch) | Apache-2.0（claimed） | vectorize, workers_ai（verified） | 不要 | has_extra_requirements |
| [Pastebin Worker](https://github.com/sharzyl/pastebin-worker) | MIT（claimed） | cron, kv, r2（verified） | 不要 | — |
| [elm-chat](https://github.com/shawnbure/elm-chat) | AGPL-3.0-only（claimed） | durable_objects（verified） | 不要 | — |
| [traks](https://github.com/shivamanupadi/traks) | MIT（claimed） | analytics_engine, cron, d1, durable_objects, kv, pipelines, r2（claimed） | 未確認 | — |
| [Inkstone](https://github.com/shuaiplus/inkstone) | LGPL-3.0-only（claimed） | cron, d1, durable_objects, kv, r2, workers_ai（verified） | 不要 | has_extra_requirements |
| [NodeCrypt](https://github.com/shuaiplus/nodecrypt) | ISC（claimed） | durable_objects（verified） | 不要 | — |
| [NodeWarden](https://github.com/shuaiplus/nodewarden) | LGPL-3.0-only（claimed） | cron, d1, durable_objects, r2（verified） | 不要 | — |
| [L Harness](https://github.com/shudesu/line-harness-oss) | MIT（claimed） | cron, d1, durable_objects, r2（claimed） | 未確認 | — |
| [X Harness](https://github.com/shudesu/x-harness-oss) | MIT（claimed） | cron, d1, r2（claimed） | 未確認 | — |
| [SonicJS](https://github.com/sonicjs-org/sonicjs) | MIT（claimed） | d1, email_routing, kv, r2（claimed） | 未確認 | — |
| [Supaflare](https://github.com/supaflare/supaflare) | MIT（claimed） | kv（claimed） | 未確認 | — |
| [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth) | MIT（claimed） | （verified） | 不要 | — |
| [Projektor](https://github.com/tajd/projektor) | MIT（claimed） | access, cron, d1, durable_objects, kv, r2（claimed） | 不要 | has_extra_requirements |
| [888wiki](https://github.com/tbdavid2019/888wiki) | AGPL-3.0-only（claimed） | cron, d1, kv, r2（verified） | 不要 | — |
| [ChatGPT Telegram Bot](https://github.com/tbxark/chatgpt-telegram-workers) | MIT（claimed） | kv, workers_ai（verified） | 不要 | — |
| [mail2telegram](https://github.com/tbxark/mail2telegram) | MIT（claimed） | cron, d1, r2, workers_ai（verified） | 不要 | has_extra_requirements |
| [HashPay](https://github.com/tgdash/hashpay) | Apache-2.0（claimed） | cron, d1, queues（verified） | 不要 | — |
| [EdgeEver](https://github.com/tianma-if/edgeever) | AGPL-3.0-only（claimed） | d1, r2（verified） | 不要 | — |
| [tldraw sync for Cloudflare](https://github.com/tldraw/tldraw-sync-cloudflare) | MIT（claimed） | durable_objects, r2（verified） | 未確認 | — |
| [Auth Inbox](https://github.com/tooonychen/authinbox) | MIT（claimed） | d1, email_routing, kv（claimed） | 不要 | has_extra_requirements |
| [Melody Auth](https://github.com/valuemelody/melody-auth) | MIT（claimed） | d1, kv（claimed） | 未確認 | — |
| [FODI](https://github.com/vcheckzen/fodi) | GPL-3.0-only（claimed） | cron, kv（verified） | 不要 | — |
| [VPS-JSQ](https://github.com/verkyer/vps-jsq) | Apache-2.0（claimed） | （verified） | 不要 | — |
| [cloudmark](https://github.com/wesleyel/cloudmark) | AGPL-3.0-only（claimed） | d1（verified） | 不要 | — |
| [UniFi DDNS](https://github.com/willswire/unifi-ddns) | MIT（claimed） | （verified） | 不要 | — |
| [2FA](https://github.com/wuzf/2fa) | MIT（claimed） | cron, durable_objects, kv（verified） | 不要 | — |
| [PasteShare](https://github.com/xiadd/pastebin-worker) | MIT（claimed） | d1, r2（verified） | 不要 | — |
| [Cap Worker](https://github.com/xytom/cap-worker) | MIT（claimed） | durable_objects（verified） | 不要 | — |
| [RSSWorker](https://github.com/yllhwa/rssworker) | MIT（claimed） | （verified） | 不要 | — |
| [logseq-selfhost](https://github.com/yshalsager/logseq-selfhost) | AGPL-3.0（claimed） | d1, durable_objects, r2（claimed） | 未確認 | — |
| [CattoPic](https://github.com/yuri-nagasaki/cattopic) | GPL-3.0-only（claimed） | cron, d1, kv, queues, r2（verified） | 不要 | — |
| [Relay](https://github.com/yuricrystal/relay) | MIT（claimed） | d1（verified） | 不要 | — |
| [One IP](https://github.com/zhihui-hu/one-ip) | AGPL-3.0-only（claimed） | （verified） | 不要 | — |
| [Renewlet](https://github.com/zhiyingzzhou/renewlet) | MIT（claimed） | cron, d1, queues, r2（verified） | 不要 | — |
| [git-on-cloudflare](https://github.com/zllovesuki/git-on-cloudflare) | MIT（claimed） | d1, durable_objects, kv, queues, r2（verified） | 要 | needs_workers_paid |
| [InfiPlot](https://github.com/zonghaoyuan/infiplot) | AGPL-3.0-only（claimed） | （verified） | 要 | needs_workers_paid |

## 掲載済みで、データに差分があるもの

なし

## 公開できない問題があるもの（ライセンス不明・OSI以外・アーカイブ済みなど）

| プロジェクト | ライセンス | Cloudflare の機能 | Workers Paid | 確認が必要な点 |
|---|---|---|---|---|
| [smail](https://github.com/akazwz/smail) | 未確認（unknown） | cron, d1, r2（claimed） | 未確認 | license_unknown |
| [DictDeck](https://github.com/asutorufa/hujiang_dictionary) | 未確認（unknown） | cron, d1, workers_ai（verified） | 不要 | license_unknown, has_extra_requirements |
| [Alle](https://github.com/bestruirui/alle) | 未確認（unknown） | d1, r2（verified） | 不要 | license_unknown, has_extra_requirements |
| [NeriPlayer Listen Together](https://github.com/cwuom/neriplayer) | 未確認（unknown） | durable_objects（claimed） | 不要 | license_unknown |
| [cf-nav](https://github.com/djkyc/cf-nav) | 未確認（unknown） | kv（verified） | 不要 | license_unknown |
| [bashupload-r2](https://github.com/dulljz/bashupload-r2) | 未確認（unknown） | cron, r2（verified） | 不要 | license_unknown |
| [RoamRadar](https://github.com/giovannibrees/travel-roamradar) | PolyForm（claimed） | cron, kv（verified） | 未確認 | license_not_osi |
| [MindPocket](https://github.com/jihe520/mindpocket) | 未確認（unknown） | d1, r2, vectorize（claimed） | 未確認 | license_unknown |
| [Kody](https://github.com/kentcdodds/kody) | FSL-1.1（claimed） | analytics_engine, cron, d1, durable_objects, email_routing, images, kv, queues, r2, vectorize, workers_ai, workflows（claimed） | 未確認 | license_not_osi |
| [Veet](https://github.com/megaconfidence/veet) | 未確認（unknown） | durable_objects（verified） | 不要 | license_unknown |
| [ResolveHQ](https://github.com/mirza-rizvi/resolvehq) | LicenseRef-ResolveHQ-Source-Available（claimed） | cron, d1, queues, r2（verified） | 不要 | license_not_osi, has_extra_requirements |
| [Cloudflare Drop](https://github.com/oustn/cloudflare-drop) | 未確認（unknown） | cron, d1, kv, r2（claimed） | 未確認 | license_unknown |
| [Telegram Push](https://github.com/sduoduo233/telegram-push) | 未確認（unknown） | kv（claimed） | 不要 | license_unknown |
| [Memos Worker](https://github.com/souvenp/memos-worker) | 未確認（unknown） | d1, kv, r2（verified） | 未確認 | license_unknown |
| [Private Notes](https://github.com/tao-t356/private-notes) | 未確認（unknown） | d1（verified） | 不要 | license_unknown |
| [Timeseal](https://github.com/teycir/timeseal) | BUSL-1.1（claimed） | d1（verified） | 未確認 | license_not_osi |

## 掲載済み（差分なし）

なし
