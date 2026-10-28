import type { Glance } from "@/lib/glance";

/** 30秒で分かる要約。長所だけでなく、向いていない人・先に確認することも並べる */
export function ToolGlance({ name, g }: { name: string; g: Glance }) {
  return (
    <section className="glance" aria-labelledby="glance-h">
      <h2 id="glance-h" className="glance__title">{`${name}を30秒で`}</h2>
      <p className="glance__what">{g.what}</p>
      <div className="glance__cols">
        <div>
          <h3 className="glance__h glance__h--good">向いている人</h3>
          <ul>{g.good_for.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
        <div>
          <h3 className="glance__h glance__h--not">向いていない人</h3>
          <ul>{g.not_for.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      </div>
      {g.check.length > 0 && (
        <div>
          <h3 className="glance__h">導入前に確認すること</h3>
          <ul>{g.check.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      )}
      <p className="glance__src">下の解説をもとに編集部がまとめました。検証状態は、解説の先頭に示しています。</p>
    </section>
  );
}
