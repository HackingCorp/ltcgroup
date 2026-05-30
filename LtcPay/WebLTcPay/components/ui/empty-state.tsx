import { Icon } from "./icon";

interface EmptyStateProps {
  icon?: string;
  title: string;
  sub?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = "search", title, sub, action }: EmptyStateProps) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "var(--bg-2)",
          margin: "0 auto 14px",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Icon name={icon} size={20} color="var(--muted)" />
      </div>
      <div
        style={{
          fontFamily: "var(--display)",
          fontWeight: 500,
          fontSize: 16,
          color: "var(--ink)",
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      {sub && (
        <div style={{ fontSize: 13, maxWidth: 360, margin: "0 auto 14px" }}>
          {sub}
        </div>
      )}
      {action}
    </div>
  );
}
