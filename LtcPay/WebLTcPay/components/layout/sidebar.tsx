"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";

interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
  isNew?: boolean;
}

interface NavSection {
  cat: string;
  items: NavItem[];
}

const ADMIN_NAV: NavSection[] = [
  {
    cat: "cat.platform",
    items: [
      { id: "overview", label: "a.overview", icon: "activity", href: "/dashboard" },
      { id: "merchants", label: "a.merchants", icon: "building", href: "/dashboard/merchants" },
      { id: "finance", label: "a.finance", icon: "trend", href: "/dashboard/finance" },
    ],
  },
  {
    cat: "cat.ops",
    items: [
      { id: "payments", label: "Paiements", icon: "receipt", href: "/dashboard/payments" },
      { id: "fees", label: "a.fees", icon: "card", href: "/dashboard/fees" },
      { id: "webhooks", label: "a.webhooks", icon: "zap", href: "/dashboard/webhooks" },
      { id: "health", label: "a.health", icon: "database", href: "/dashboard/health" },
      { id: "disputes", label: "a.disputes", icon: "alert", href: "/dashboard/disputes", badge: 7 },
    ],
  },
  {
    cat: "cat.gov",
    items: [
      { id: "security", label: "a.security", icon: "shield", href: "/dashboard/security" },
      { id: "users", label: "a.users", icon: "users", href: "/dashboard/users" },
      { id: "settings", label: "m.settings", icon: "settings", href: "/dashboard/settings" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLang();
  const { logout } = useAuth();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside className="sidebar">
      {ADMIN_NAV.map((sec, si) => (
        <div key={si}>
          <div className="sec-label">{t(sec.cat)}</div>
          {sec.items.map((it) => (
            <Link
              key={it.id}
              href={it.href}
              className={`nav-item ${isActive(it.href) ? "active" : ""}`}
            >
              <Icon name={it.icon} size={15} />
              <span>{it.label.includes(".") ? t(it.label) : it.label}</span>
              {it.badge && <span className="badge">{it.badge}</span>}
              {it.isNew && <span className="new-pill">NEW</span>}
            </Link>
          ))}
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <button
        className="nav-item"
        onClick={() => { logout(); router.push("/auth/login"); }}
        style={{ border: 0, background: "transparent", width: "100%", color: "var(--rose)" }}
      >
        <Icon name="logout" size={15} />
        <span>{t("m.logout")}</span>
      </button>
    </aside>
  );
}
