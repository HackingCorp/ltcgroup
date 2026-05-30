interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

const ICONS: Record<string, string> = {
  arrow: "M5 12h14M13 6l6 6-6 6",
  arrowUp: "M12 19V5M6 11l6-6 6 6",
  arrowDown: "M12 5v14M18 13l-6 6-6-6",
  arrowL: "M19 12H5M11 6l-6 6 6 6",
  check: "M4 12l5 5L20 6",
  x: "M6 6l12 12M6 18L18 6",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  search: "M11 17a6 6 0 100-12 6 6 0 000 12zM20 20l-3.5-3.5",
  bell: "M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16zM10 21a2 2 0 004 0",
  settings: "M12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zm7.4 5.5a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
  home: "M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9z",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
  link: "M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1",
  code: "M16 18l6-6-6-6M8 6l-6 6 6 6M14 4l-4 16",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  users: "M16 12a4 4 0 100-8 4 4 0 000 8zM8 13a3 3 0 100-6 3 3 0 000 6zM2 21a6 6 0 0112 0M14 14a6 6 0 018 7",
  chart: "M3 3v18h18M7 14l4-4 4 3 5-7",
  bar: "M4 20v-8m6 8V8m6 12V4m6 16v-6",
  copy: "M8 8h12v12H8zM4 4h12v4M4 4v12h4",
  download: "M12 4v12m-5-5l5 5 5-5M4 20h16",
  upload: "M12 20V8m-5 5l5-5 5 5M4 4h16",
  filter: "M3 5h18M6 12h12M10 19h4",
  chevR: "M9 6l6 6-6 6",
  chevL: "M15 6l-6 6 6 6",
  chevD: "M6 9l6 6 6-6",
  chevU: "M18 15l-6-6-6 6",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
  eyeOff: "M2 12s4-7 10-7c2 0 4 .5 5.5 1.5M22 12s-4 7-10 7c-2 0-4-.5-5.5-1.5M3 3l18 18M9.5 9.5a3 3 0 004.5 4",
  lock: "M5 11h14v10H5zM8 11V7a4 4 0 018 0v4",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18",
  shield: "M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z",
  refresh: "M3 12a9 9 0 0115-6l3-3M21 12a9 9 0 01-15 6l-3 3M21 3v6h-6M3 21v-6h6",
  qr: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3M14 21h3M21 14v3M21 18v3M18 18h3",
  receipt: "M5 3h14v18l-2-1.5L15 21l-2-1.5L11 21l-2-1.5L7 21l-2-1.5V3zM8 8h8M8 12h8M8 16h5",
  book: "M4 4h6a3 3 0 013 3v13a2 2 0 00-2-2H4V4zM20 4h-6a3 3 0 00-3 3v13a2 2 0 012-2h7V4z",
  building: "M5 3h14v18H5zM9 7h2M13 7h2M9 11h2M13 11h2M9 15h6v6",
  briefcase: "M3 8h18v12H3zM8 8V6a2 2 0 012-2h4a2 2 0 012 2v2",
  card: "M3 7h18v12H3zM3 11h18M7 16h4",
  bank: "M3 10l9-7 9 7M5 10v9M9 10v9M15 10v9M19 10v9M3 21h18",
  trend: "M3 17l6-6 4 4 8-8M14 7h7v7",
  alert: "M12 8v5m0 4v.01M4 19h16L12 4z",
  info: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 8v.01M11 12h1v5h1",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
  pause: "M9 4v16M15 4v16",
  play: "M6 4l14 8-14 8z",
  zap: "M13 2L3 14h7l-1 8 11-14h-8l1-6z",
  flag: "M4 4v18M4 4h12l-2 4 2 4H4",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 18l9 5 9-5",
  database: "M3 5c0-1 4-2 9-2s9 1 9 2v14c0 1-4 2-9 2s-9-1-9-2V5zM3 12c0 1 4 2 9 2s9-1 9-2",
  activity: "M3 12h4l3-9 4 18 3-9h4",
  message: "M21 11.5a8.4 8.4 0 01-9.5 8.5L3 21l1.5-5.5A8.4 8.4 0 1121 11.5z",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  external: "M14 4h6v6M20 4l-9 9M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h14a1 1 0 001-1v-4",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6",
  star: "M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z",
  wallet: "M3 6h18v14H3zM3 6V4h16v2M17 13h.01",
  phone: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.81.36 1.6.67 2.36a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.76.31 1.55.54 2.36.67a2 2 0 011.72 2z",
  mail: "M3 5h18v14H3zM3 5l9 7 9-7",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
};

export function Icon({ name, size = 16, color = "currentColor", strokeWidth = 1.7, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={{ display: "block", flexShrink: 0 }}
    >
      <path
        d={ICONS[name] || ""}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export { ICONS };
