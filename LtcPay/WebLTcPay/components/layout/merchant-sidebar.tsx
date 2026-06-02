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

const MERCHANT_NAV: NavSection[] = [
  {
    cat: "cat.encaisser",
    items: [
      { id: "overview", label: "m.overview", icon: "home", href: "/merchant/dashboard" },
      { id: "tx", label: "m.tx", icon: "receipt", href: "/merchant/dashboard/payments", badge: 3 },
      { id: "links", label: "m.links", icon: "link", href: "/merchant/dashboard/links" },
      { id: "refunds", label: "m.refunds", icon: "refresh", href: "/merchant/dashboard/refunds" },
    ],
  },
  {
    cat: "cat.finance",
    items: [
      { id: "payouts", label: "m.payouts", icon: "bank", href: "/merchant/dashboard/payouts" },
      { id: "reports", label: "m.reports", icon: "chart", href: "/merchant/dashboard/reports" },
      { id: "billing", label: "m.billing", icon: "card", href: "/merchant/dashboard/billing" },
    ],
  },
  {
    cat: "cat.dev",
    items: [
      { id: "api", label: "m.api", icon: "code", href: "/merchant/dashboard/api-keys" },
    ],
  },
  {
    cat: "cat.compte",
    items: [
      { id: "kyc", label: "m.kyc", icon: "shield", href: "/merchant/dashboard/kyc", isNew: true },
      { id: "team", label: "m.team", icon: "users", href: "/merchant/dashboard/team" },
      { id: "notifs", label: "m.notifs", icon: "bell", href: "/merchant/dashboard/notifications", badge: 12 },
      { id: "settings", label: "m.settings", icon: "settings", href: "/merchant/dashboard/settings" },
    ],
  },
];

export function MerchantSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLang();
  const { logout } = useAuth();

  const isActive = (href: string) => {
    if (href === "/merchant/dashboard") return pathname === "/merchant/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside className="sidebar">
      {MERCHANT_NAV.map((sec, si) => (
        <div key={si}>
          <div className="sec-label">{t(sec.cat)}</div>
          {sec.items.map((it) => (
            <Link
              key={it.id}
              href={it.href}
              className={`nav-item ${isActive(it.href) ? "active" : ""}`}
            >
              <Icon name={it.icon} size={15} />
              <span>{t(it.label)}</span>
              {it.badge && <span className="badge">{it.badge}</span>}
              {it.isNew && <span className="new-pill">NEW</span>}
            </Link>
          ))}
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <button
        className="nav-item"
        onClick={() => { logout(); router.push("/merchant/login"); }}
        style={{ border: 0, background: "transparent", width: "100%", color: "var(--rose)" }}
      >
        <Icon name="logout" size={15} />
        <span>{t("m.logout")}</span>
      </button>
    </aside>
  );
}
