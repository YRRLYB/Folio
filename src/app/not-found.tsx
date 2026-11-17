import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" style={{ maxWidth: 720, margin: "auto", padding: "min(20vh, 150px) 24px" }}>
      <p style={{ color: "var(--accent)", letterSpacing: ".12em", fontSize: 12 }}>404 / NOT FOUND</p>
      <h1 style={{ fontSize: "clamp(2rem, 5vw, 4rem)", fontWeight: 560, margin: "20px 0 12px" }}>这个位置还没有内容。</h1>
      <p style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>可能是链接已移动，也可能内容还在创作中。</p>
      <Link href="/" style={{ display: "inline-block", marginTop: 28, color: "var(--accent)", borderBottom: "1px solid currentColor", paddingBottom: 4 }}>返回首页 →</Link>
    </main>
  );
}
