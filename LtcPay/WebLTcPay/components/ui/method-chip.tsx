const METHOD_CONFIG: Record<string, { bg: string; init: string; name: string; fg?: string }> = {
  orange: { bg: "var(--orange-money)", init: "OM", name: "Orange Money" },
  mtn: { bg: "var(--mtn)", init: "MTN", name: "MTN MoMo", fg: "#2a2200" },
  wave: { bg: "var(--wave)", init: "WV", name: "Wave", fg: "#003" },
  card: { bg: "var(--ink)", init: "VS", name: "Carte" },
  moov: { bg: "#003DA5", init: "MV", name: "Moov" },
  airtel: { bg: "#E60012", init: "AT", name: "Airtel" },
};

interface MethodChipProps {
  kind: string;
  label?: string;
}

const OPERATOR_LOGOS: Record<string, string> = {
  orange: "/operators/orange.svg",
  mtn: "/operators/mtn.svg",
  wave: "/operators/wave.svg",
  moov: "/operators/moov.svg",
  airtel: "/operators/airtel.svg",
  card: "/operators/card.svg",
};

export function MethodChip({ kind, label }: MethodChipProps) {
  const cfg = METHOD_CONFIG[kind] || { bg: "var(--ink)", init: "??", name: kind };
  const logo = OPERATOR_LOGOS[kind];
  return (
    <span className="method-chip">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="swatch" src={logo} alt={cfg.name} />
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
