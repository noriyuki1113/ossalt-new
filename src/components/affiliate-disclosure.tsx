export function AffiliateDisclosure({ className = "" }: { className?: string }) {
  return (
    <p className={`muted ${className}`} style={{ fontSize: "0.75rem" }}>
      この記事にはアフィリエイトリンクが含まれる場合があります。ただし、掲載内容はossalt.jpの編集方針に基づいて選定しています。
    </p>
  );
}
