"use client";

interface ToggleProps {
  on: boolean;
  onChange?: (value: boolean) => void;
}

export function Toggle({ on, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!on)}
      style={{
        appearance: "none",
        border: 0,
        cursor: "pointer",
        width: 36,
        height: 20,
        padding: 0,
        background: on ? "var(--ink)" : "var(--line-2)",
        borderRadius: 999,
        position: "relative",
        transition: "background 0.15s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "white",
          transition: "left 0.15s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}
