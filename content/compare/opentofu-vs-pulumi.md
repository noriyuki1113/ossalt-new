---
description: "OpenTofuとPulumiの違いを比べます。どちらもTerraformの代わりにインフラをコードで管理できるオープンソースですが、OpenTofuはTerraformから分かれた互換のツール、PulumiはTypeScriptやPythonなどのふだんの言語でインフラを書くツールです。"
updated: "2026-10-06"
---

**結論：今あるTerraformのコードと知識をそのまま使い続けたいならOpenTofu、インフラの定義を、ふだん使っているプログラミング言語で、関数や型を使って書きたいならPulumiです。**

- **OpenTofuを選ぶ場合**：Terraformのライセンスの変更（2023年）をきっかけに、Terraformから分かれて（フォークして）作られたプロジェクトです。Terraformと同じHCLという書き方で、多くのプロバイダーやモジュールをそのまま使えます。Linux Foundationのもとで開発されています。
- **Pulumiを選ぶ場合**：TypeScript、Python、Go、C#などで、インフラの構成を書きます。繰り返しや条件分岐、テストなど、プログラミング言語の機能をそのまま使えるので、開発者の多いチームに向いています。

**移行の注意**：TerraformからOpenTofuへの移行は、比較的小さな手間で済むことが多いです。Pulumiへの移行は、書き方が変わるため、コードの書き直しが必要になります（変換の道具も用意されています）。

**ライセンス**：OpenTofuはMPL-2.0、PulumiはApache-2.0です。Pulumiは、状態の管理などをクラウドのサービスとして提供していますが、自分で用意した保存先も使えます。

詳しくは[Terraformの代替](/alternatives/terraform/)のページを参照してください。
