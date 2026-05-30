"use client";

import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/lib/i18n";
import { Avatar } from "@/components/ui/avatar";
import { Pill } from "@/components/ui/pill";

interface HeaderProps {
  context?: "admin" | "merchant";
}

export function Header({ context = "admin" }: HeaderProps) {
  const { user, merchantUser } = useAuth();
  const { lang, setLang } = useLang();

  const displayName =
    context === "merchant"
      ? merchantUser?.name || "Marchand"
      : user?.full_name || "Admin";

  return (
    <header className="topbar">
      {/* Brand */}
      <div className="brand">
        <span className="mark">N</span>
        <span>Nkap Pay</span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Language switch */}
      <div className="lang-switch">
        <button
          className={lang === "fr" ? "on" : ""}
          onClick={() => setLang("fr")}
        >
          FR
        </button>
        <button
          className={lang === "en" ? "on" : ""}
          onClick={() => setLang("en")}
        >
          EN
        </button>
      </div>

      {/* User chip */}
      <div className="who">
        <Avatar
          name={displayName}
          size={22}
          color={context === "merchant" ? "var(--success)" : "var(--rose)"}
        />
        <span>{displayName}</span>
        <Pill
          tone={context === "merchant" ? "live" : "info"}
          plain
        >
          {context === "merchant" ? "live" : "admin"}
        </Pill>
      </div>
    </header>
  );
}
