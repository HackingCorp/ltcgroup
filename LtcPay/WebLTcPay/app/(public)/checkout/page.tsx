"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { T, useLang } from "@/lib/i18n";

/* ── Checkout preview / demo page ─────────────────────── */

const ITEMS = [
  { qty: 2, fr: "Pagne Faso Dan Fani", en: "Faso Dan Fani fabric", price: "50 000 F" },
  { qty: 1, fr: "Sac en raphia tress\u00e9", en: "Woven raffia bag", price: "22 500 F" },
  { qty: 0, fr: "Livraison express", en: "Express delivery", price: "2 500 F" },
];

const METHODS = [
  { id: "orange", bg: "var(--orange-money, #ff6600)", code: "OM", name: "Orange Money", sub: "+237 6XX XX XX XX", fee: "~4 sec" },
  { id: "mtn", bg: "var(--mtn, #ffcc00)", fg: "#2a2200", code: "MTN", name: "MTN Mobile Money", sub: "+237 6XX XX XX XX", fee: "~6 sec" },
  { id: "wave", bg: "var(--wave, #1dc7ea)", fg: "#003", code: "WV", name: "Wave", subFr: "QR ou lien magique", subEn: "QR or magic link", feeFr: "Gratuit", feeEn: "Free" },
];

export default function CheckoutPage() {
  const { lang } = useLang();
  const [step, setStep] = useState<"select" | "confirm" | "success">("select");
  const [method, setMethod] = useState("orange");
  const [phone, setPhone] = useState("670 12 34 56");

  return (
    <div style={{
      minHeight: "calc(100vh - 110px)",
      background: "var(--bg-2)",
      padding: "32px 24px",
      display: "grid",
      placeItems: "start center",
    }}>
      <style>{`
        .ck-card {
          width: 100%; max-width: 1040px;
          background: var(--surface, #fff);
          border: 1px solid var(--line);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: var(--shadow-md, 0 4px 24px rgba(0,0,0,.06));
          display: grid;
          grid-template-columns: 1fr 1.05fr;
        }
        @media (max-width: 768px) {
          .ck-card { grid-template-columns: 1fr; }
        }

        .ck-order {
          background: var(--ink);
          color: var(--bg, #fafaf7);
          padding: 36px 32px;
          display: flex; flex-direction: column;
          position: relative; overflow: hidden;
        }
        .ck-order::after {
          content: ""; position: absolute; right: -100px; bottom: -100px;
          width: 320px; height: 320px; border-radius: 50%;
          background: radial-gradient(circle, rgba(201,255,61,0.18), transparent 70%);
        }

        .ck-order-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 36px; position: relative; }
        .ck-merch { font-family: var(--mono); font-size: 10px; color: rgba(250,250,247,0.5); text-transform: uppercase; letter-spacing: 0.08em; }
        .ck-merch strong { font-family: var(--display); font-weight: 500; font-size: 14px; color: var(--bg, #fafaf7); margin-left: 6px; text-transform: none; letter-spacing: -0.005em; }
        .ck-secured { font-family: var(--mono); font-size: 10px; color: rgba(250,250,247,0.5); text-transform: uppercase; letter-spacing: 0.08em; }
        .ck-secured strong { color: var(--accent, #c9ff3d); margin-left: 6px; text-transform: none; }

        .ck-amount-label { font-family: var(--mono); font-size: 11px; color: rgba(250,250,247,0.5); text-transform: uppercase; letter-spacing: 0.08em; position: relative; }
        .ck-amount {
          font-family: var(--display); font-weight: 500;
          font-size: 88px; line-height: 0.95; letter-spacing: -0.03em;
          margin: 8px 0 14px;
          position: relative;
        }
        .ck-amount small { font-size: 28px; opacity: 0.45; margin-left: 6px; }
        .ck-amount-desc { color: rgba(250,250,247,0.7); font-size: 14px; line-height: 1.5; max-width: 320px; margin: 0; position: relative; }

        .ck-items {
          margin-top: 32px; padding-top: 20px;
          border-top: 1px dashed rgba(250,250,247,0.2);
          position: relative;
        }
        .ck-items .li { display: flex; justify-content: space-between; padding: 7px 0; font-size: 13px; color: rgba(250,250,247,0.85); }
        .ck-items .li .qty { color: rgba(250,250,247,0.4); margin-right: 6px; font-family: var(--mono); font-size: 12px; }
        .ck-items .tot {
          margin-top: 8px; padding-top: 12px;
          border-top: 1px dashed rgba(250,250,247,0.2);
          color: var(--bg, #fafaf7); font-family: var(--mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
          display: flex; justify-content: space-between;
        }
        .ck-items .tot strong { font-family: var(--display); font-size: 18px; font-weight: 500; text-transform: none; letter-spacing: -0.01em; }

        .ck-foot {
          margin-top: auto; padding-top: 32px;
          display: flex; justify-content: space-between;
          font-family: var(--mono); font-size: 10px;
          color: rgba(250,250,247,0.4);
          text-transform: uppercase; letter-spacing: 0.08em;
          position: relative;
        }

        .ck-pay { padding: 36px; display: flex; flex-direction: column; min-height: 580px; }
        .ck-pay-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .ck-pay-head h2 { font-family: var(--display); font-weight: 500; font-size: 28px; letter-spacing: -0.02em; margin: 0; line-height: 1.1; }
        .ck-pay-head .sub { color: var(--muted); font-size: 13px; margin: 6px 0 0; }

        .pm-section-label { font-family: var(--mono); font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 10px; }

        .pm-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .pm-item {
          display: grid; grid-template-columns: 42px 1fr auto; gap: 14px;
          align-items: center; padding: 12px 14px;
          background: var(--surface, #fff); border: 1px solid var(--line);
          border-radius: 10px; cursor: pointer;
          transition: border-color 0.12s;
        }
        .pm-item:hover { border-color: var(--line-2, #ccc); }
        .pm-item.active { border-color: var(--ink); border-width: 2px; padding: 11px 13px; }
        .pm-item .pm-logo {
          width: 42px; height: 42px; border-radius: 11px;
          display: grid; place-items: center; color: white;
          font-family: var(--mono); font-size: 11px; font-weight: 700;
        }
        .pm-item .pm-label strong { font-size: 14px; font-weight: 500; display: block; }
        .pm-item .pm-label small { color: var(--muted); font-size: 11px; font-family: var(--mono); display: block; margin-top: 2px; }
        .pm-item .pm-meta { display: flex; align-items: center; gap: 8px; }
        .pm-item .pm-fee { font-family: var(--mono); font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
        .pm-item .pm-radio { width: 18px; height: 18px; border: 1.5px solid var(--line-2, #ccc); border-radius: 50%; }
        .pm-item.active .pm-radio { border-width: 5px; border-color: var(--ink); }

        .ck-input-row {
          display: flex; border: 1px solid var(--line); border-radius: 10px;
          overflow: hidden; background: var(--surface, #fff);
        }
        .ck-input-row:focus-within { border-color: var(--primary); }
        .ck-input-row .flag {
          padding: 11px 12px; background: var(--bg-2);
          border-right: 1px solid var(--line);
          display: flex; align-items: center; gap: 6px; font-size: 13px;
        }
        .ck-input-row .flag-emoji {
          width: 18px; height: 12px; border-radius: 1px;
          background: linear-gradient(to bottom, #007a5e 33.33%, #ce1126 33.33% 66.66%, #fcd116 66.66%);
        }
        .ck-input-row input {
          flex: 1; border: 0; padding: 11px 14px; background: transparent;
          font-family: var(--mono); font-size: 14px; outline: none;
          color: var(--ink);
        }

        .pay-btn {
          appearance: none; border: 0; cursor: pointer;
          background: var(--ink); color: var(--bg, #fafaf7);
          padding: 18px 22px; border-radius: 12px;
          font-family: var(--body); font-size: 15px; font-weight: 500;
          display: flex; justify-content: space-between; align-items: center;
          margin-top: auto;
        }
        .pay-btn:hover { background: #000; }
        .pay-btn .amt { font-family: var(--display); font-weight: 500; font-size: 20px; }

        .trust {
          display: flex; justify-content: center; gap: 14px; margin-top: 14px;
          font-family: var(--mono); font-size: 9px; color: var(--muted);
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        .trust span { display: inline-flex; align-items: center; gap: 4px; }

        .otp-stage { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 20px 12px; flex: 1; justify-content: center; }
        .otp-glyph {
          width: 88px; height: 88px; border-radius: 22px;
          background: linear-gradient(135deg, var(--orange-money, #ff6600), #ff8a3a);
          display: grid; place-items: center;
          color: white; font-size: 38px;
          margin-bottom: 22px;
        }
        .otp-stage h3 { font-family: var(--display); font-weight: 500; font-size: 26px; letter-spacing: -0.02em; margin: 0 0 8px; }
        .otp-stage p { color: var(--muted); font-size: 14px; line-height: 1.5; max-width: 360px; margin: 0 0 20px; }
        .otp-cells { display: flex; gap: 8px; margin-bottom: 16px; }
        .otp-cell {
          width: 42px; height: 54px; border: 1px solid var(--line); border-radius: 10px;
          display: grid; place-items: center; font-family: var(--mono); font-size: 22px;
          background: var(--surface, #fff);
        }
        .otp-cell.filled { border-color: var(--ink); }
        .otp-cell.cursor::after { content: ""; display: block; width: 2px; height: 22px; background: var(--ink); animation: blink 1s infinite; }
        @keyframes blink { 50% { opacity: 0; } }

        .succ-stage { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 20px 12px; flex: 1; justify-content: center; }
        .succ-mark {
          width: 84px; height: 84px; border-radius: 50%;
          background: var(--accent, #c9ff3d);
          display: grid; place-items: center;
          margin-bottom: 22px; position: relative;
        }
        .succ-mark::after { content: ""; position: absolute; inset: -8px; border-radius: 50%; border: 2px solid var(--accent, #c9ff3d); opacity: 0.25; }
        .succ-stage h3 { font-family: var(--display); font-weight: 500; font-size: 36px; letter-spacing: -0.025em; margin: 0 0 8px; }
        .succ-stage .ref { font-family: var(--mono); font-size: 11px; color: var(--muted); margin-bottom: 22px; }
        .succ-summary {
          width: 100%; max-width: 320px;
          background: var(--bg); border: 1px solid var(--line);
          border-radius: 10px; padding: 16px;
          margin-bottom: 22px;
        }
        .succ-summary .s-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
        .succ-summary .s-row .k { color: var(--muted); }
        .succ-summary .s-row .v { font-family: var(--mono); font-size: 12px; }
      `}</style>

      <div className="ck-card">
        {/* ── LEFT: order summary ── */}
        <aside className="ck-order">
          <div className="ck-order-head">
            <span className="ck-merch">
              <T fr="Vous payez" en="You pay" /> <strong>Boutique Mami</strong>
            </span>
            <span className="ck-secured">
              <T fr="S\u00e9curis\u00e9 par" en="Secured by" /> <strong>Nkap Pay</strong>
            </span>
          </div>

          <div className="ck-amount-label"><T fr="Total \u00e0 payer" en="Total to pay" /></div>
          <div className="ck-amount">75 000<small>F CFA</small></div>
          <p className="ck-amount-desc">
            <T
              fr="Commande #ORDER-3041 \u2014 3 articles, livraison Yaound\u00e9 sous 48h."
              en="Order #ORDER-3041 \u2014 3 items, Yaound\u00e9 delivery in 48h."
            />
          </p>

          <div className="ck-items">
            {ITEMS.map((item, i) => (
              <div key={i} className="li">
                <span>
                  {item.qty > 0 && <span className="qty">{item.qty}\u00d7</span>}
                  <T fr={item.fr} en={item.en} />
                </span>
                <span>{item.price}</span>
              </div>
            ))}
            <div className="tot">
              <span>Total</span>
              <strong>75 000 F</strong>
            </div>
          </div>

          <div className="ck-foot">
            <span>{"\u2197"} <T fr="Retour vers mamishop.cm" en="Back to mamishop.cm" /></span>
            <span><T fr="Expire dans" en="Expires in" /> 27:42</span>
          </div>
        </aside>

        {/* ── RIGHT: payment flow ── */}
        <section className="ck-pay">
          {step === "select" && (
            <>
              <div className="ck-pay-head">
                <div>
                  <h2><T fr="Comment voulez-vous payer ?" en="How would you like to pay?" /></h2>
                  <p className="sub"><T fr="Choisissez votre m\u00e9thode. Aucun compte requis." en="Pick your method. No account needed." /></p>
                </div>
              </div>

              <div className="pm-section-label">Mobile Money</div>
              <div className="pm-list">
                {METHODS.map((p) => (
                  <div
                    key={p.id}
                    className={"pm-item " + (method === p.id ? "active" : "")}
                    onClick={() => setMethod(p.id)}
                  >
                    <div className="pm-logo" style={{ background: p.bg, color: p.fg || "white" }}>{p.code}</div>
                    <div className="pm-label">
                      <strong>{p.name}</strong>
                      <small>{p.sub || (lang === "en" ? p.subEn : p.subFr)}</small>
                    </div>
                    <div className="pm-meta">
                      <span className="pm-fee">{p.fee || (lang === "en" ? p.feeEn : p.feeFr)}</span>
                      <span className="pm-radio" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pm-section-label"><T fr="Carte bancaire" en="Bank card" /></div>
              <div className="pm-list">
                <div
                  className={"pm-item " + (method === "card" ? "active" : "")}
                  onClick={() => setMethod("card")}
                >
                  <div className="pm-logo" style={{ background: "var(--ink)" }}>VS</div>
                  <div className="pm-label">
                    <strong>Visa \u00b7 Mastercard \u00b7 GIM-UEMOA</strong>
                    <small>3-D Secure</small>
                  </div>
                  <div className="pm-meta">
                    <span className="pm-fee">2,9%</span>
                    <span className="pm-radio" />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div className="pm-section-label"><T fr="Num\u00e9ro mobile money" en="Mobile money number" /></div>
                <div className="ck-input-row">
                  <span className="flag">
                    <span className="flag-emoji" />
                    <span className="mono">+237</span>
                  </span>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                  <T
                    fr="Demande de paiement envoy\u00e9e \u00e0 ce num\u00e9ro. Confirmez avec votre PIN."
                    en="A payment request goes to this number. Confirm with your PIN."
                  />
                </div>
              </div>

              <button className="pay-btn" onClick={() => setStep("confirm")}>
                <span><T fr="Payer maintenant" en="Pay now" /></span>
                <span className="amt">75 000 F {"\u2192"}</span>
              </button>

              <div className="trust">
                <span><Icon name="lock" size={10} /> TLS 1.3</span>
                <span><Icon name="shield" size={10} /> PCI-DSS</span>
                <span><T fr="BEAC agr\u00e9\u00e9" en="BEAC certified" /></span>
              </div>
            </>
          )}

          {step === "confirm" && (
            <div className="otp-stage">
              <div className="otp-glyph">{"\ud83d\udcf1"}</div>
              <h3><T fr="Confirmez sur votre t\u00e9l\u00e9phone" en="Confirm on your phone" /></h3>
              <p>
                <T fr="Une notification Orange Money a \u00e9t\u00e9 envoy\u00e9e au" en="An Orange Money notification went to" />{" "}
                <strong className="mono" style={{ color: "var(--ink)", fontSize: 13 }}>+237 {phone}</strong>.{" "}
                <T fr="Composez" en="Dial" />{" "}
                <span style={{
                  display: "inline-block",
                  background: "var(--bg-2)",
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  padding: "2px 8px",
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                }}>#150*4#</span>{" "}
                <T fr="et saisissez votre PIN." en="and enter your PIN." />
              </p>
              <div className="otp-cells">
                {[true, true, true, true, false].map((filled, i) => (
                  <div key={i} className={"otp-cell " + (filled ? "filled" : "cursor")}>
                    {filled ? "\u2022" : ""}
                  </div>
                ))}
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                <T fr="Expire dans" en="Expires in" />{" "}
                <strong style={{ color: "var(--ink)" }}>02:14</strong>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 28 }}>
                <button className="btn btn-ghost" onClick={() => setStep("select")}>
                  {"\u2190"} <T fr="Annuler" en="Cancel" />
                </button>
                <button className="btn btn-primary" onClick={() => setStep("success")}>
                  <T fr="J\u0027ai confirm\u00e9" en="I confirmed" /> {"\u2192"}
                </button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="succ-stage">
              <div className="succ-mark">
                <Icon name="check" size={36} color="var(--ink)" />
              </div>
              <h3><T fr="Paiement r\u00e9ussi" en="Payment successful" /></h3>
              <div className="ref">
                PAY-A1B2C3D4E5F6 \u00b7 <T fr="il y a quelques secondes" en="a few seconds ago" />
              </div>
              <div className="succ-summary">
                <div className="s-row"><span className="k"><T fr="Montant" en="Amount" /></span><span className="v">75 000 F</span></div>
                <div className="s-row"><span className="k"><T fr="M\u00e9thode" en="Method" /></span><span className="v">Orange Money</span></div>
                <div className="s-row"><span className="k"><T fr="B\u00e9n\u00e9ficiaire" en="Beneficiary" /></span><span className="v">Boutique Mami</span></div>
                <div className="s-row"><span className="k"><T fr="Date" en="Date" /></span><span className="v">26 mai 14:42</span></div>
              </div>
              <button className="btn btn-primary" style={{ marginBottom: 10 }}>
                <T fr="Retour \u00e0 mamishop.cm" en="Back to mamishop.cm" /> <Icon name="arrow" size={14} color="white" />
              </button>
              <button className="btn btn-ghost">
                <Icon name="download" size={13} /> <T fr="T\u00e9l\u00e9charger le re\u00e7u" en="Download receipt" />
              </button>
              <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 24, maxWidth: 320, lineHeight: 1.5 }}>
                <T
                  fr="Un SMS de confirmation a \u00e9t\u00e9 envoy\u00e9 \u00e0 votre num\u00e9ro. Conservez la r\u00e9f\u00e9rence pour toute r\u00e9clamation."
                  en="A confirmation SMS has been sent. Keep the reference for any claim."
                />
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
