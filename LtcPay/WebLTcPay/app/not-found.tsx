import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 32 }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--ink)", color: "var(--accent)", display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 28, margin: "0 auto 24px" }}>N</div>
        <div style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 120, lineHeight: 1, letterSpacing: "-0.04em", color: "var(--line-2)" }}>404</div>
        <h1 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.02em", margin: "16px 0 8px" }}>Page introuvable</h1>
        <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.5, margin: "0 0 28px" }}>
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link href="/" className="btn btn-primary" style={{ textDecoration: "none" }}>
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
