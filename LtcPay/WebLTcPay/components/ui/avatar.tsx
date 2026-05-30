interface AvatarProps {
  name: string;
  size?: number;
  color?: string;
}

export function Avatar({ name, size = 28, color }: AvatarProps) {
  const initials = (name || "?")
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
  const hue = name ? (name.charCodeAt(0) * 37) % 360 : 220;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: color || `oklch(0.55 0.13 ${hue})`,
        color: "white",
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--mono)",
        fontWeight: 600,
        fontSize: size * 0.36,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}
