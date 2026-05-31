"use client";

import Link from "next/link";
import { T } from "@/lib/i18n";

const FOOTER_COUNTRIES = [
  { code: "CM", flag: "\u{1F1E8}\u{1F1F2}" },
  { code: "GA", flag: "\u{1F1EC}\u{1F1E6}" },
  { code: "CD", flag: "\u{1F1E8}\u{1F1E9}" },
  { code: "CG", flag: "\u{1F1E8}\u{1F1EC}" },
  { code: "TD", flag: "\u{1F1F9}\u{1F1E9}" },
  { code: "CF", flag: "\u{1F1E8}\u{1F1EB}" },
  { code: "SN", flag: "\u{1F1F8}\u{1F1F3}" },
  { code: "CI", flag: "\u{1F1E8}\u{1F1EE}" },
  { code: "BJ", flag: "\u{1F1E7}\u{1F1EF}" },
  { code: "TG", flag: "\u{1F1F9}\u{1F1EC}" },
  { code: "BF", flag: "\u{1F1E7}\u{1F1EB}" },
  { code: "ML", flag: "\u{1F1F2}\u{1F1F1}" },
];

export function Footer() {
  return (
    <>
      <style>{`
        .lv-footer { padding: 64px 0 32px; border-top: 1px solid var(--line); }
        .lv-footer-grid { display: grid; grid-template-columns: 1.6fr repeat(4,1fr); gap: 40px; }
        .lv-footer h5 { font-family: var(--mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 0 0 14px; font-weight: 500; }
        .lv-footer ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 7px; }
        .lv-footer a { color: var(--ink); text-decoration: none; font-size: 13px; }
        .lv-footer a:hover { color: var(--primary); }
        .lv-footer-tag { color: var(--muted); font-size: 13px; line-height: 1.5; margin: 14px 0; max-width: 260px; }
        .lv-footer-flags { display: flex; gap: 4px; flex-wrap: wrap; font-size: 20px; }
        .lv-footer-flags-more { font-family: var(--mono); font-size: 11px; font-weight: 600; background: var(--ink); color: var(--accent); padding: 2px 8px; border-radius: 6px; display: inline-flex; align-items: center; }
        .lv-footer-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 56px; padding-top: 24px; border-top: 1px solid var(--line); font-family: var(--mono); font-size: 11px; color: var(--muted); }
        .lv-footer .lv-container { max-width: 1240px; margin: 0 auto; padding: 0 32px; }
        @media (max-width: 980px) {
          .lv-footer-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <footer className="lv-footer">
        <div className="lv-container">
          <div className="lv-footer-grid">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: "var(--display)", fontWeight: 600, fontSize: 17 }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--ink)", color: "var(--accent)", display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 14 }}>N</span>
                Nkap Pay
              </div>
              <p className="lv-footer-tag">
                <T fr="La passerelle de paiement pour l'Afrique. Une filiale du groupe LTC." en="The payment gateway for Africa. A subsidiary of LTC Group." />
              </p>
              <div className="lv-footer-flags">
                {FOOTER_COUNTRIES.map((c) => <span key={c.code}>{c.flag}</span>)}
                <span className="lv-footer-flags-more">+6</span>
              </div>
            </div>
            {[
              { h: <T fr="Produit" en="Product" />, items: [{ l: <T fr="Tarifs" en="Pricing" />, href: "/pricing" }, { l: <T fr="Comment ça marche" en="How it works" />, href: "/how-it-works" }, { l: <T fr="Liens de paiement" en="Payment links" />, href: "#" }, { l: <T fr="Sous-comptes" en="Sub-accounts" />, href: "#" }] },
              { h: <T fr="Développeurs" en="Developers" />, items: [{ l: "Documentation", href: "/docs" }, { l: "Status", href: "/status" }, { l: "Changelog", href: "#" }, { l: "SDK Flutter", href: "#" }] },
              { h: <T fr="Société" en="Company" />, items: [{ l: <T fr="À propos" en="About" />, href: "#" }, { l: <T fr="Conformité" en="Compliance" />, href: "#" }, { l: "Terms", href: "#" }, { l: "Privacy", href: "#" }] },
              { h: "Contact", items: [{ l: "hello@nkap.pay", href: "#" }, { l: "+237 222 22 11 00", href: "#" }, { l: "Yaoundé · Douala", href: "#" }, { l: "Abidjan · Dakar", href: "#" }] },
            ].map((col, i) => (
              <div key={i}>
                <h5>{col.h}</h5>
                <ul>
                  {col.items.map((item, j) => (
                    <li key={j}><Link href={item.href}>{item.l}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="lv-footer-bottom">
            <span>© 2026 LTC Group SARL</span>
            <span>XAF · XOF · NGN · KES · UGX · EUR · USD</span>
          </div>
        </div>
      </footer>
    </>
  );
}
