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

export function MethodChip({ kind, label }: MethodChipProps) {
  const cfg = METHOD_CONFIG[kind] || { bg: "var(--ink)", init: "??", name: kind };
  return (
    <span className="method-chip">
      <span
        className="swatch"
        style={{ background: cfg.bg, color: cfg.fg || "white" }}
      >
        {cfg.init}
      </span>
      {label || cfg.name}
    </span>
  );
}
