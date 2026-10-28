# OSS詳細ページ監査（全ページ）

- 生成：2026-10-28T22:50:27.217Z（データの取得日：2026-10-28T22:01:09.489Z）
- 対象：399ページ（掲載中389件＋アーカイブ済みなど。`out/tools/<id>/` に出力されたすべて）
- 方法：`node scripts/tool-pages-audit.mjs`（ビルド済みHTMLとデータの照合。ネットワーク不使用。順位・流入への影響は推測しない）

## 集計（ページの最悪の重要度）

| 重大 | 中程度 | 軽微 | 問題なし |
| ---: | ---: | ---: | ---: |
| 10 | 77 | 312 | 0 |

手書きの解説あり：155件／「30秒で」要約あり：8件／noindex：0件

## 問題の種類ごとの件数

| 問題 | 重要度 | ページ数 |
| --- | --- | ---: |
| indexable-not-in-sitemap | 重大 | 10 |
| no-guide | 中程度 | 244 |
| archived | 中程度 | 10 |
| thin-guide | 中程度 | 1 |
| unverified | 軽微 | 155 |
| no-glance | 軽微 | 147 |
| few-inbound | 軽微 | 10 |

## 重大・中程度の問題があるページ

- **flowise**：indexable-not-in-sitemap（/tools/flowise/）
- **pocketbase**：indexable-not-in-sitemap（/tools/pocketbase/）
- **maybe-finance**：indexable-not-in-sitemap（/tools/maybe-finance/）
- **filebrowser**：indexable-not-in-sitemap（/tools/filebrowser/）
- **luckysheet**：indexable-not-in-sitemap（/tools/luckysheet/）
- **piper**：indexable-not-in-sitemap（/tools/piper/）
- **peppermint**：indexable-not-in-sitemap（/tools/peppermint/）
- **ohmyform**：indexable-not-in-sitemap（/tools/ohmyform/）
- **papermerge**：indexable-not-in-sitemap（/tools/papermerge/）
- **undb**：indexable-not-in-sitemap（/tools/undb/）

## ページ別一覧

| ページ | 最悪 | 手書き（字） | 要約 | 被リンク | FAQ定型率 | 問題 |
| --- | --- | ---: | :-: | ---: | ---: | --- |
| openclaw | 中程度 | — |  | 49 | 69% | no-guide |
| hermes-agent | 中程度 | — |  | 49 | 69% | no-guide |
| n8n | 軽微 | 1333 |  | 24 | 38% |  |
| stable-diffusion-webui | 軽微 | 682 |  | 48 | 63% |  |
| ollama | 軽微 | 1295 |  | 52 | 69% |  |
| dify | 軽微 | 930 |  | 50 | 50% |  |
| open-webui | 軽微 | 709 |  | 25 | 56% |  |
| llama-cpp | 軽微 | 813 |  | 7 | 69% |  |
| comfyui | 軽微 | 766 |  | 12 | 69% |  |
| langflow | 軽微 | 641 |  | 16 | 69% |  |
| rustdesk | 軽微 | 662 |  | 23 | 56% |  |
| excalidraw | 軽微 | 627 |  | 22 | 56% |  |
| vllm | 軽微 | 920 |  | 10 | 69% |  |
| supabase | 軽微 | 731 |  | 59 | 44% |  |
| whisper | 軽微 | 939 |  | 11 | 50% |  |
| immich | 軽微 | 916 |  | 30 | 63% |  |
| odoo | 軽微 | 898 |  | 19 | 44% |  |
| superset | 軽微 | 840 |  | 15 | 56% |  |
| stirling-pdf | 軽微 | 686 |  | 18 | 56% |  |
| ragflow | 軽微 | 720 |  | 17 | 63% |  |
| lobechat | 軽微 | 812 |  | 15 | 56% |  |
| paddleocr | 軽微 | 882 |  | 15 | 38% |  |
| grafana | 軽微 | 712 |  | 28 | 56% |  |
| uptime-kuma | 軽微 | 1294 |  | 31 | 69% |  |
| flowise | 重大 | 1004 |  | 1 | 50% | indexable-not-in-sitemap archived |
| obs | 軽微 | 786 |  | 25 | 56% |  |
| syncthing | 軽微 | 796 |  | 27 | 38% |  |
| ffmpeg | 軽微 | 784 |  | 24 | 56% |  |
| tesseract | 軽微 | 885 |  | 13 | 50% |  |
| netdata | 軽微 | 800 |  | 26 | 56% |  |
| strapi | 軽微 | 968 |  | 56 | 56% |  |
| coder | 軽微 | 941 |  | 53 | 69% |  |
| gpt4all | 軽微 | 903 |  | 11 | 63% |  |
| hoppscotch | 軽微 | 744 |  | 54 | 56% |  |
| airflow | 軽微 | 902 |  | 21 | 50% |  |
| prometheus | 軽微 | 847 |  | 26 | 56% |  |
| appflowy | 軽微 | 720 |  | 45 | 56% |  |
| docusaurus | 軽微 | 907 |  | 40 | 56% |  |
| affine | 軽微 | 842 |  | 42 | 63% |  |
| anythingllm | 軽微 | 654 |  | 8 | 63% |  |
| ghost | 軽微 | 913 |  | 18 | 56% |  |
| cal-com | 軽微 | 856 |  | 12 | 63% |  |
| twenty | 軽微 | 934 |  | 18 | 63% |  |
| traefik | 軽微 | 834 |  | 56 | 56% |  |
| coolify | 軽微 | 699 |  | 22 | 69% |  |
| gitea | 軽微 | 1293 | ○ | 14 | 56% |  |
| rocket-chat | 軽微 | 945 |  | 24 | 50% |  |
| vaultwarden | 軽微 | 743 | ○ | 36 | 63% |  |
| nocodb | 軽微 | 681 |  | 22 | 44% |  |
| memos | 軽微 | 712 |  | 37 | 69% |  |
| rclone | 軽微 | 787 |  | 22 | 56% |  |
| plane | 軽微 | 1329 | ○ | 24 | 69% |  |
| jellyfin | 軽微 | 852 |  | 23 | 56% |  |
| private-gpt | 軽微 | 878 |  | 10 | 69% |  |
| joplin | 軽微 | 936 |  | 37 | 56% |  |
| penpot | 軽微 | 695 |  | 18 | 44% |  |
| appwrite | 軽微 | 925 |  | 14 | 44% |  |
| whisper-cpp | 軽微 | 1055 |  | 8 | 69% |  |
| erpnext | 軽微 | 884 |  | 17 | 56% |  |
| pocketbase | 重大 | 795 |  | 4 | 56% | indexable-not-in-sitemap archived |
| discourse | 軽微 | 967 |  | 20 | 56% |  |
| librechat | 軽微 | 690 |  | 14 | 69% |  |
| meilisearch | 軽微 | 758 |  | 6 | 69% |  |
| maybe-finance | 重大 | — |  | 0 | 63% | indexable-not-in-sitemap no-guide archived |
| metabase | 軽微 | 657 | ○ | 14 | 44% |  |
| dbeaver | 軽微 | 827 |  | 4 | 56% |  |
| text-generation-webui | 軽微 | 1336 |  | 10 | 63% |  |
| mattermost | 軽微 | 847 | ○ | 25 | 50% |  |
| gogs | 軽微 | 878 |  | 9 | 50% |  |
| huginn | 軽微 | 719 |  | 15 | 56% |  |
| keycloak | 軽微 | 649 |  | 34 | 56% |  |
| localai | 軽微 | 925 |  | 6 | 56% |  |
| hyperswitch | 軽微 | 877 |  | 20 | 69% |  |
| tldraw | 軽微 | 916 |  | 19 | 56% |  |
| sentry | 軽微 | 1077 |  | 24 | 44% |  |
| chatwoot | 軽微 | 677 |  | 23 | 56% |  |
| umami | 軽微 | 866 |  | 24 | 63% |  |
| kong | 軽微 | 905 |  | 8 | 50% |  |
| milvus | 軽微 | 856 |  | 9 | 50% |  |
| payload | 軽微 | 912 |  | 15 | 56% |  |
| bruno | 軽微 | 965 |  | 9 | 56% |  |
| paperless-ngx | 軽微 | 611 |  | 14 | 69% |  |
| postiz | 軽微 | 697 |  | 19 | 63% |  |
| tooljet | 軽微 | 1017 |  | 11 | 69% |  |
| siyuan | 軽微 | 948 |  | 17 | 44% |  |
| logseq | 軽微 | 987 |  | 7 | 56% |  |
| jan | 軽微 | 628 |  | 6 | 63% |  |
| appsmith | 軽微 | 945 |  | 11 | 56% |  |
| nextcloud | 軽微 | 717 |  | 31 | 56% |  |
| headscale | 軽微 | 1076 |  | 34 | 44% |  |
| lossless-cut | 軽微 | 841 |  | 27 | 56% |  |
| zulip | 軽微 | 872 |  | 23 | 50% |  |
| directus | 軽微 | 1421 |  | 15 | 44% |  |
| jenkins | 軽微 | 992 |  | 9 | 56% |  |
| sharex | 軽微 | 881 |  | 18 | 50% |  |
| medusa | 軽微 | 870 |  | 18 | 56% |  |
| outline | 軽微 | 712 |  | 15 | 44% |  |
| posthog | 軽微 | 859 |  | 20 | 56% |  |
| continue | 軽微 | 834 |  | 7 | 69% |  |
| jitsi | 軽微 | 646 |  | 25 | 56% |  |
| quivr | 中程度 | — |  | 10 | 69% | no-guide |
| gitness | 軽微 | 1196 |  | 8 | 69% |  |
| insomnia | 軽微 | 884 |  | 8 | 56% |  |
| photoprism | 軽微 | 859 |  | 13 | 56% |  |
| portainer | 軽微 | 901 |  | 7 | 44% |  |
| langfuse | 軽微 | 879 |  | 10 | 56% |  |
| dokploy | 軽微 | 1168 |  | 8 | 56% |  |
| trilium | 軽微 | 927 |  | 8 | 63% |  |
| argo-cd | 軽微 | — |  | 8 | 56% |  |
| filebrowser | 重大 | — |  | 0 | 50% | indexable-not-in-sitemap archived |
| khoj | 軽微 | 1038 |  | 10 | 63% |  |
| podman | 軽微 | 986 |  | 7 | 63% |  |
| restic | 軽微 | 952 |  | 13 | 38% |  |
| harbor | 軽微 | 823 |  | 3 | 56% |  |
| trivy | 軽微 | 996 |  | 34 | 56% |  |
| qdrant | 軽微 | 862 |  | 10 | 69% |  |
| nuclei | 軽微 | 1096 |  | 32 | 44% |  |
| k3s | 軽微 | 865 |  | 3 | 56% |  |
| ocrmypdf | 軽微 | 959 |  | 13 | 56% |  |
| redash | 軽微 | 809 |  | 12 | 44% |  |
| ntfy | 軽微 | 913 | ○ | 17 | 56% |  |
| kestra | 軽微 | 827 |  | 22 | 50% |  |
| magento | 軽微 | — |  | 18 | 38% |  |
| opentofu | 軽微 | 1012 |  | 7 | 56% |  |
| signoz | 軽微 | 933 |  | 9 | 69% |  |
| dokku | 軽微 | 830 |  | 7 | 56% |  |
| actual | 軽微 | 824 |  | 20 | 69% |  |
| saleor | 軽微 | — |  | 18 | 56% |  |
| woocommerce | 軽微 | — |  | 16 | 56% |  |
| surrealdb | 軽微 | 1263 |  | 22 | 38% |  |
| flameshot | 軽微 | 741 |  | 17 | 56% |  |
| wikijs | 軽微 | 662 |  | 11 | 56% |  |
| invokeai | 軽微 | 1144 |  | 8 | 69% |  |
| bagisto | 軽微 | 896 |  | 17 | 56% |  |
| infisical | 軽微 | 923 |  | 10 | 69% |  |
| chroma | 軽微 | 852 |  | 11 | 56% |  |
| activepieces | 軽微 | 974 |  | 21 | 63% |  |
| keepassxc | 軽微 | 1020 |  | 6 | 38% |  |
| netbird | 軽微 | 922 |  | 8 | 44% |  |
| ente | 軽微 | 853 |  | 10 | 69% |  |
| plausible | 軽微 | 951 |  | 23 | 50% |  |
| karakeep | 軽微 | 1031 |  | 9 | 69% |  |
| budibase | 軽微 | 892 |  | 10 | 31% |  |
| authelia | 軽微 | 947 |  | 10 | 56% |  |
| node-red | 軽微 | — |  | 14 | 50% |  |
| openseo | 軽微 | 942 |  | 10 | 69% |  |
| parse | 軽微 | — |  | 9 | 50% |  |
| focalboard | 軽微 | 903 |  | 22 | 44% |  |
| dub | 軽微 | 908 |  | 14 | 56% |  |
| blender | 軽微 | — |  | 11 | 56% |  |
| authentik | 軽微 | 703 |  | 10 | 69% |  |
| jaeger | 軽微 | — |  | 12 | 56% |  |
| monica | 軽微 | 763 |  | 10 | 50% |  |
| nocobase | 軽微 | 1160 |  | 19 | 38% |  |
| faster-whisper | 軽微 | 846 |  | 8 | 69% |  |
| prefect | 軽微 | — |  | 13 | 50% |  |
| whisperx | 軽微 | 1031 |  | 8 | 50% |  |
| firefly-iii | 軽微 | 1034 |  | 21 | 56% |  |
| listmonk | 軽微 | — |  | 19 | 56% |  |
| pulumi | 軽微 | 885 |  | 5 | 56% |  |
| typesense | 軽微 | 818 |  | 6 | 56% |  |
| matomo | 軽微 | — |  | 24 | 50% |  |
| spree | 軽微 | — |  | 14 | 44% |  |
| handbrake | 軽微 | — |  | 22 | 56% |  |
| temporal | 軽微 | — |  | 10 | 50% |  |
| super-productivity | 中程度 | — |  | 17 | 69% | no-guide |
| cap | 中程度 | — |  | 11 | 69% | no-guide |
| navidrome | 軽微 | — |  | 5 | 56% |  |
| mkdocs | 軽微 | — |  | 8 | 38% |  |
| wekan | 軽微 | — |  | 23 | 50% |  |
| krayin | 中程度 | — |  | 14 | 63% | no-guide |
| livekit | 中程度 | — |  | 11 | 69% | no-guide |
| univer | 中程度 | — |  | 18 | 63% | no-guide |
| pgvector | 軽微 | — |  | 7 | 44% |  |
| sops | 軽微 | — |  | 5 | 50% |  |
| mediamtx | 中程度 | — |  | 5 | 69% | no-guide |
| etherpad | 中程度 | — |  | 8 | 63% | no-guide |
| docmost | 中程度 | — |  | 14 | 63% | no-guide |
| openobserve | 中程度 | — |  | 13 | 69% | no-guide |
| audacity | 軽微 | — |  | 4 | 56% |  |
| openproject | 軽微 | — |  | 19 | 56% |  |
| vitepress | 軽微 | — |  | 8 | 44% |  |
| docker-mailserver | 軽微 | — |  | 15 | 56% |  |
| teable | 中程度 | — |  | 19 | 69% | no-guide |
| bookstack | 軽微 | 615 |  | 16 | 56% |  |
| apisix | 軽微 | — |  | 7 | 56% |  |
| opensearch | 中程度 | — |  | 3 | 69% | no-guide |
| wazuh | 軽微 | — |  | 5 | 50% |  |
| documenso | 中程度 | — |  | 10 | 69% | no-guide |
| docuseal | 中程度 | — |  | 11 | 69% | no-guide |
| dagster | 軽微 | — |  | 5 | 50% |  |
| victoria-metrics | 軽微 | — |  | 11 | 56% |  |
| prestashop | 軽微 | — |  | 9 | 44% |  |
| zap | 軽微 | — |  | 6 | 56% |  |
| bigbluebutton | 軽微 | — |  | 10 | 44% |  |
| nodebb | 軽微 | — |  | 12 | 44% |  |
| element | 中程度 | — |  | 11 | 63% | no-guide |
| luckysheet | 重大 | — |  | 0 | 63% | indexable-not-in-sitemap no-guide archived |
| libretranslate | 中程度 | — |  | 10 | 69% | no-guide |
| coder-oss | 軽微 | — |  | 7 | 56% |  |
| peertube | 軽微 | — |  | 4 | 56% |  |
| windmill | 中程度 | — |  | 5 | 63% | no-guide |
| mailspring | 軽微 | — |  | 15 | 56% |  |
| uvdesk | 軽微 | — |  | 19 | 38% |  |
| weaviate | 軽微 | — |  | 9 | 44% |  |
| semgrep | 軽微 | — |  | 3 | 56% |  |
| freshrss | 軽微 | — |  | 6 | 56% |  |
| phpmyadmin | 軽微 | — |  | 4 | 56% |  |
| opencart | 軽微 | — |  | 3 | 56% |  |
| postal | 中程度 | — |  | 15 | 63% | no-guide |
| cryptomator | 軽微 | — |  | 4 | 56% |  |
| grav | 軽微 | — |  | 13 | 56% |  |
| seafile | 軽微 | — |  | 8 | 50% |  |
| mautic | 軽微 | 648 |  | 20 | 56% |  |
| cachet | 軽微 | — |  | 3 | 50% |  |
| casdoor | 中程度 | — |  | 9 | 69% | no-guide |
| formbricks | 軽微 | — |  | 17 | 56% |  |
| shotcut | 軽微 | — |  | 11 | 56% |  |
| zitadel | 中程度 | — |  | 11 | 69% | no-guide |
| apitable | 軽微 | — |  | 12 | 56% |  |
| la-suite-docs | 軽微 | 961 |  | 9 | 69% |  |
| mailcow | 軽微 | — |  | 15 | 56% |  |
| audiobookshelf | 中程度 | — |  | 5 | 69% | no-guide |
| gotify | 軽微 | — |  | 5 | 56% |  |
| robotframework | 軽微 | — |  | 3 | 56% |  |
| duplicati | 軽微 | — |  | 11 | 50% |  |
| stalwart | 軽微 | — |  | 12 | 56% |  |
| onedev | 軽微 | — |  | 7 | 56% |  |
| logto | 軽微 | — |  | 11 | 56% |  |
| caprover | 軽微 | — |  | 7 | 56% |  |
| typebot | 軽微 | — |  | 14 | 56% |  |
| crowdsec | 軽微 | — |  | 5 | 56% |  |
| filestash | 軽微 | — |  | 9 | 56% |  |
| notesnook | 中程度 | — |  | 7 | 69% | no-guide |
| supertokens | 軽微 | — |  | 8 | 56% |  |
| kratos | 軽微 | — |  | 8 | 50% |  |
| akaunting | 軽微 | — |  | 21 | 44% |  |
| kamal | 中程度 | — |  | 7 | 63% | no-guide |
| devpod | 軽微 | — |  | 7 | 38% |  |
| borg | 軽微 | — |  | 10 | 44% |  |
| kopia | 軽微 | — |  | 10 | 56% |  |
| unleash | 軽微 | — |  | 3 | 56% |  |
| invoice-ninja | 軽微 | — |  | 22 | 38% |  |
| automatisch | 軽微 | — |  | 4 | 56% |  |
| planka | 軽微 | — |  | 18 | 50% |  |
| wallabag | 軽微 | — |  | 9 | 56% |  |
| grype | 軽微 | — |  | 8 | 56% |  |
| frappe-hr | 中程度 | — |  | 11 | 69% | no-guide |
| kanboard | 軽微 | — |  | 11 | 50% |  |
| arize-phoenix | 軽微 | — |  | 7 | 56% |  |
| sylius | 軽微 | — |  | 4 | 56% |  |
| openreplay | 中程度 | — |  | 18 | 69% | no-guide |
| rybbit | 軽微 | 936 |  | 12 | 69% |  |
| owncloud | 軽微 | — |  | 9 | 56% |  |
| leantime | 軽微 | — |  | 5 | 50% |  |
| velero | 軽微 | — |  | 7 | 56% |  |
| gatus | 中程度 | — |  | 6 | 69% | no-guide |
| owncast | 軽微 | — |  | 6 | 56% |  |
| tekton | 軽微 | — |  | 8 | 56% |  |
| krita | 軽微 | — |  | 6 | 56% |  |
| grist | 中程度 | — |  | 10 | 69% | no-guide |
| weblate | 軽微 | — |  | 10 | 56% |  |
| netmaker | 軽微 | — |  | 6 | 44% |  |
| piper | 重大 | — |  | 0 | 63% | indexable-not-in-sitemap no-guide archived |
| openvscode | 中程度 | — |  | 7 | 63% | no-guide |
| shiori | 軽微 | — |  | 9 | 56% |  |
| ghostfolio | 中程度 | — |  | 16 | 69% | no-guide |
| linkding | 中程度 | — |  | 6 | 69% | no-guide |
| blinko | 中程度 | — |  | 10 | 63% | no-guide |
| libreoffice | 軽微 | — |  | 14 | 56% |  |
| miniflux | 軽微 | — |  | 6 | 56% |  |
| vendure | 中程度 | — |  | 5 | 69% | no-guide |
| roundcube | 軽微 | — |  | 10 | 56% |  |
| kokoro | 軽微 | — |  | 5 | 50% |  |
| drawio | 軽微 | 1736 |  | 5 | 56% |  |
| kaneo | 軽微 | 873 |  | 6 | 69% |  |
| mailpit | 中程度 | — |  | 4 | 69% | no-guide |
| suitecrm | 中程度 | — |  | 14 | 69% | no-guide |
| redmine | 軽微 | — |  | 4 | 56% |  |
| hanko | 中程度 | — |  | 8 | 69% | no-guide |
| hyperdx | 中程度 | — |  | 9 | 69% | no-guide |
| suricata | 軽微 | — |  | 5 | 56% |  |
| graylog | 軽微 | — |  | 5 | 44% |  |
| nhost | 中程度 | — |  | 10 | 69% | no-guide |
| gimp | 軽微 | — |  | 6 | 56% |  |
| highlight | 軽微 | — |  | 2 | 38% |  |
| woodpecker | 軽微 | — |  | 8 | 56% |  |
| adminer | 軽微 | — |  | 3 | 44% |  |
| mediawiki | 軽微 | — |  | 10 | 56% |  |
| headlamp | 軽微 | — |  | 4 | 56% |  |
| heyform | 中程度 | — |  | 11 | 69% | no-guide |
| defectdojo | 軽微 | — |  | 10 | 44% |  |
| tigervnc | 軽微 | — |  | 19 | 56% |  |
| anytype | 軽微 | — |  | 10 | 50% |  |
| mailu | 軽微 | — |  | 9 | 56% |  |
| solidtime | 中程度 | — |  | 9 | 69% | no-guide |
| cryptpad | 中程度 | — |  | 9 | 69% | no-guide |
| meshcentral | 軽微 | — |  | 19 | 50% |  |
| onlyoffice | 軽微 | — |  | 12 | 56% |  |
| couchdb | 軽微 | — |  | 9 | 56% |  |
| wallos | 中程度 | — |  | 11 | 63% | no-guide |
| zabbix | 軽微 | — |  | 4 | 56% |  |
| librephotos | 中程度 | — |  | 7 | 69% | no-guide |
| flarum | 中程度 | — |  | 9 | 63% | no-guide |
| opensign | 中程度 | — |  | 10 | 69% | no-guide |
| plasmic | 中程度 | — |  | 6 | 69% | no-guide |
| hedgedoc | 軽微 | — |  | 7 | 56% |  |
| fathom | 軽微 | — |  | 11 | 44% |  |
| zammad | 軽微 | 645 | ○ | 19 | 56% |  |
| openshot | 軽微 | — |  | 9 | 56% |  |
| rancher-desktop | 軽微 | — |  | 8 | 56% |  |
| openpanel | 中程度 | — |  | 7 | 69% | no-guide |
| countly | 軽微 | — |  | 9 | 44% |  |
| passbolt | 軽微 | — |  | 6 | 50% |  |
| lightdash | 中程度 | — |  | 5 | 69% | no-guide |
| kill-bill | 軽微 | — |  | 3 | 56% |  |
| osticket | 軽微 | — |  | 11 | 50% |  |
| easy-appointments | 軽微 | — |  | 10 | 56% |  |
| standard-notes | 中程度 | — |  | 8 | 69% | no-guide |
| baserow | 軽微 | 1719 |  | 15 | 69% |  |
| vikunja | 中程度 | 564 | ○ | 7 | 69% | thin-guide |
| helicone | 中程度 | — |  | 8 | 63% | no-guide |
| silverbullet | 中程度 | — |  | 7 | 63% | no-guide |
| shopware | 軽微 | — |  | 3 | 56% |  |
| gnucash | 軽微 | — |  | 11 | 50% |  |
| kdenlive | 軽微 | — |  | 7 | 56% |  |
| argos-translate | 中程度 | — |  | 8 | 63% | no-guide |
| synapse | 中程度 | — |  | 8 | 63% | no-guide |
| send | 軽微 | — |  | 4 | 50% |  |
| mailtrain | 軽微 | — |  | 5 | 50% |  |
| mediacms | 中程度 | — |  | 4 | 63% | no-guide |
| beancount | 軽微 | — |  | 10 | 50% |  |
| surveyjs | 軽微 | — |  | 7 | 56% |  |
| frappe-crm | 中程度 | — |  | 12 | 69% | no-guide |
| kimai | 軽微 | — |  | 12 | 56% |  |
| limesurvey | 軽微 | — |  | 10 | 56% |  |
| greenshot | 軽微 | — |  | 8 | 56% |  |
| goatcounter | 軽微 | — |  | 12 | 44% |  |
| radicale | 軽微 | — |  | 10 | 56% |  |
| rallly | 中程度 | — |  | 10 | 69% | no-guide |
| collabora-online | 軽微 | — |  | 10 | 56% |  |
| dependency-track | 軽微 | — |  | 6 | 56% |  |
| freescout | 中程度 | — |  | 14 | 69% | no-guide |
| pgadmin | 軽微 | — |  | 6 | 56% |  |
| writefreely | 軽微 | — |  | 9 | 50% |  |
| hledger | 中程度 | — |  | 9 | 69% | no-guide |
| jitsu | 軽微 | — |  | 6 | 56% |  |
| guacamole | 軽微 | — |  | 6 | 50% |  |
| espocrm | 軽微 | — |  | 13 | 56% |  |
| ackee | 軽微 | — |  | 11 | 50% |  |
| pdfsam | 軽微 | — |  | 11 | 50% |  |
| invoiceplane | 軽微 | — |  | 10 | 56% |  |
| unlighthouse | 中程度 | — |  | 9 | 69% | no-guide |
| cerbos | 軽微 | — |  | 6 | 56% |  |
| piwigo | 中程度 | — |  | 4 | 69% | no-guide |
| tolgee | 軽微 | — |  | 9 | 56% |  |
| rudderstack | 軽微 | — |  | 6 | 44% |  |
| pretix | 軽微 | — |  | 8 | 44% |  |
| whisper-asr-webservice | 中程度 | — |  | 3 | 63% | no-guide |
| chaskiq | 軽微 | — |  | 10 | 38% |  |
| ethercalc | 軽微 | — |  | 6 | 56% |  |
| revolt | 中程度 | — |  | 5 | 69% | no-guide |
| baikal | 軽微 | — |  | 5 | 50% |  |
| peppermint | 重大 | — |  | 0 | 63% | indexable-not-in-sitemap no-guide archived |
| libredesk | 中程度 | — |  | 9 | 69% | no-guide |
| nextcloud-talk | 軽微 | — |  | 5 | 56% |  |
| wbo | 軽微 | — |  | 7 | 50% |  |
| ohmyform | 重大 | — |  | 0 | 50% | indexable-not-in-sitemap archived |
| papermerge | 重大 | — |  | 0 | 50% | indexable-not-in-sitemap archived |
| alerta | 軽微 | — |  | 3 | 50% |  |
| horilla | 軽微 | — |  | 11 | 56% |  |
| xwiki | 軽微 | — |  | 10 | 44% |  |
| undb | 重大 | — |  | 1 | 63% | indexable-not-in-sitemap no-guide archived |
| openvidu | 軽微 | — |  | 8 | 56% |  |
| spacebar | 中程度 | — |  | 6 | 69% | no-guide |
| taiga | 軽微 | — |  | 8 | 50% |  |
| ec-cube | 軽微 | — |  | 6 | 56% |  |
| docspell | 中程度 | — |  | 8 | 63% | no-guide |
| pydio | 軽微 | — |  | 8 | 50% |  |
| orangehrm | 軽微 | — |  | 11 | 50% |  |
| keila | 中程度 | — |  | 5 | 69% | no-guide |
| serpbear | 中程度 | — |  | 10 | 63% | no-guide |
| faveo | 軽微 | — |  | 10 | 50% |  |
| psitransfer | 軽微 | — |  | 4 | 44% |  |
| bugsink | 軽微 | — |  | 8 | 56% |  |
| trudesk | 中程度 | — |  | 10 | 63% | no-guide |
| galene | 軽微 | — |  | 7 | 56% |  |
| traggo | 軽微 | — |  | 9 | 50% |  |
| docassemble | 軽微 | — |  | 11 | 56% |  |
| solidinvoice | 軽微 | — |  | 8 | 56% |  |
| libresign | 中程度 | — |  | 8 | 69% | no-guide |
| bolt-cms | 中程度 | — |  | 9 | 69% | no-guide |
| siteone-crawler | 中程度 | — |  | 10 | 63% | no-guide |
| seonaut | 中程度 | — |  | 10 | 63% | no-guide |
| trac | 軽微 | — |  | 8 | 38% |  |
| cockpit-cms | 中程度 | — |  | 7 | 63% | no-guide |
| tryton | 中程度 | — |  | 8 | 69% | no-guide |
| tracim | 軽微 | — |  | 8 | 50% |  |
| glitchtip | 中程度 | — |  | 7 | 63% | no-guide |
