interface SectionHeadProps {
  eyebrow?: string;
  title: string;
  sub?: string;
  right?: React.ReactNode;
}

export function SectionHead({ eyebrow, title, sub, right }: SectionHeadProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: 16,
        gap: 20,
        flexWrap: "wrap",
      }}
    >
      <div>
        {eyebrow && (
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted)",
              marginBottom: 6,
            }}
          >
            {eyebrow}
          </div>
        )}
        <h2
          style={{
            fontFamily: "var(--display)",
            fontWeight: 500,
            fontSize: 22,
            letterSpacing: "-0.02em",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {title}
        </h2>
        {sub && (
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0", maxWidth: 480 }}>
            {sub}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}
