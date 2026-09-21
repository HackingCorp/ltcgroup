"use client";

import { useState } from "react";
import { backendUrl } from "@/lib/backend-url";

const METHOD_CONFIG: Record<string, { bg: string; init: string; name: string; fg?: string }> = {
  orange: { bg: "var(--orange-money)", init: "OM", name: "Orange Money" },
  mtn: { bg: "var(--mtn)", init: "MTN", name: "MTN MoMo", fg: "#2a2200" },
  wave: { bg: "var(--wave)", init: "WV", name: "Wave", fg: "#003" },
  card: { bg: "var(--ink)", init: "VS", name: "Carte" },
  moov: { bg: "#003DA5", init: "MV", name: "Moov" },
  airtel: { bg: "#E60012", init: "AT", name: "Airtel" },
  mpesa: { bg: "#4CB050", init: "MP", name: "M-Pesa" },
  afrimoney: { bg: "#003399", init: "AF", name: "Afrimoney" },
  tmoney: { bg: "#00A651", init: "TM", name: "T-Money" },
  free: { bg: "#CD1E25", init: "FR", name: "Free Money" },
  muni: { bg: "#009639", init: "MU", name: "Muni" },
};

/**
 * Built-in artwork, used only when the operator has no logo of its own.
 * These are generic marks: an admin who uploads a logo in Pays & Operateurs
 * expects to see that logo here, which is what `logoUrl` is for.
 */
const FALLBACK_LOGOS: Record<string, string> = {
  orange: "/operators/orange.svg",
  mtn: "/operators/mtn.svg",
  wave: "/operators/wave.svg",
  moov: "/operators/moov.svg",
  airtel: "/operators/airtel.svg",
  card: "/operators/card.svg",
};

interface MethodChipProps {
  kind: string;
  label?: string;
  /** The operator's own logo, as stored on its row (`operator_logo_url`). */
  logoUrl?: string | null;
}

export function MethodChip({ kind, label, logoUrl }: MethodChipProps) {
  const cfg = METHOD_CONFIG[kind] || { bg: "var(--ink)", init: "??", name: kind };
  const [broken, setBroken] = useState(false);

  // The registered logo wins; the bundled one covers operators without any.
  const registered = logoUrl && !broken ? backendUrl(logoUrl) : "";
  const src = registered || FALLBACK_LOGOS[kind] || "";

  return (
    <span className="method-chip">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="swatch"
          src={src}
          alt={cfg.name}
          // A deleted or unreachable file falls back instead of showing a
          // broken image: the chip has to stay readable either way.
          onError={() => setBroken(true)}
        />
      ) : (
        <span
          className="swatch"
          style={{ background: cfg.bg, color: cfg.fg || "white" }}
        >
          {cfg.init}
        </span>
      )}
      {label || cfg.name}
    </span>
  );
}
