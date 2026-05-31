"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Toggle } from "@/components/ui/toggle";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { T } from "@/lib/i18n";
import { merchantDashboardService } from "@/services/merchant-dashboard.service";

const toneMap: Record<string, { bg: string; c: string; ic: string }> = {
  success: { bg: "oklch(0.93 0.05 145)", c: "var(--accent-success)", ic: "check" },
  warn: { bg: "oklch(0.93 0.08 80)", c: "oklch(0.55 0.15 80)", ic: "alert" },
  info: { bg: "oklch(0.97 0.01 260)", c: "var(--ink)", ic: "info" },
  fail: { bg: "oklch(0.93 0.05 25)", c: "oklch(0.55 0.2 25)", ic: "x" },
  neutral: { bg: "var(--bg-2)", c: "var(--ink)", ic: "arrowDown" },
};

function groupNotificationsByDay(items: any[]): { day: string; items: any[] }[] {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();

  const groups: Record<string, any[]> = {};
  const order: string[] = [];

  for (const item of items) {
    const d = new Date(item.created_at);
    let label: string;
    if (d.toDateString() === today) {
      label = "today";
    } else if (d.toDateString() === yesterday) {
      label = "yesterday";
    } else {
      label = "earlier";
    }
    if (!groups[label]) {
      groups[label] = [];
      order.push(label);
    }
    groups[label].push(item);
  }

  return order.map((key) => ({ day: key, items: groups[key] }));
}

function dayLabel(key: string): React.ReactNode {
  if (key === "today") return <T fr="Aujourd'hui" en="Today" />;
  if (key === "yesterday") return <T fr="Hier" en="Yesterday" />;
  return <T fr="Plus ancien" en="Earlier" />;
}

export default function MerchantNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [channels, setChannels] = useState<Record<string, boolean>>({});
  const [alerts, setAlerts] = useState<Record<string, boolean>>({});
  const [channelList, setChannelList] = useState<any[]>([]);
  const [alertTypeList, setAlertTypeList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [notifRes, unreadRes, prefsRes] = await Promise.all([
          merchantDashboardService.getNotifications({ page: 1, page_size: 50 }),
          merchantDashboardService.getUnreadCount(),
          merchantDashboardService.getNotificationPreferences(),
        ]);
        setNotifications(notifRes.items || []);
        setUnreadCount(notifRes.unread_count ?? unreadRes.unread_count ?? 0);

        const ch = prefsRes.channels || [];
        const at = prefsRes.alert_types || [];
        setChannelList(ch);
        setAlertTypeList(at);
        setChannels(Object.fromEntries(ch.map((c: any) => [c.key, c.enabled ?? c.defaultOn ?? false])));
        setAlerts(Object.fromEntries(at.map((a: any) => [a.key, a.enabled ?? a.defaultOn ?? false])));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <PageWrapper crumb={[<T key="c1" fr="Compte" en="Account" />, <T key="c2" fr="Notifications" en="Notifications" />]} title={<T fr="Notifications" en="Notifications" />} sub=""><div style={{padding:40,textAlign:"center",color:"var(--muted)"}}>Chargement...</div></PageWrapper>;

  const groups = groupNotificationsByDay(notifications);

  return (
    <PageWrapper
      crumb={[<T key="c1" fr="Compte" en="Account" />, <T key="c2" fr="Notifications" en="Notifications" />]}
      title={<T fr="Notifications" en="Notifications" />}
      sub={<T fr={`${unreadCount} non lues \u00b7 Tout marquer comme lu`} en={`${unreadCount} unread \u00b7 Mark all as read`} />}
      actions={
        <>
          <button className="btn btn-ghost btn-sm">
            <T fr="Tout marquer lu" en="Mark all read" />
          </button>
          <button className="btn btn-ghost btn-sm">
            <Icon name="settings" size={13} /> <T fr="Preferences" en="Preferences" />
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        {/* Notification list */}
        <div>
          {groups.map((g, i) => (
            <div key={i} style={{ marginBottom: 24 }}>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                {dayLabel(g.day)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {g.items.map((n, j) => {
                  const tone = (n.tone || "info").toLowerCase();
                  const t = toneMap[tone] || toneMap.info;
                  const timeStr = n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
                  return (
                    <div
                      key={n.id || j}
                      className="card"
                      style={{
                        padding: "14px 18px",
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                        position: "relative",
                        borderColor: !n.is_read ? "var(--ink)" : "var(--line)",
                      }}
                    >
                      {!n.is_read && (
                        <div style={{ position: "absolute", left: -4, top: 16, width: 6, height: 6, borderRadius: "50%", background: "var(--ink)" }} />
                      )}
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: t.bg, display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <Icon name={t.ic} size={14} color={t.c} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: !n.is_read ? 500 : 450, fontSize: 14 }}>{n.title}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{n.description}</div>
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{timeStr}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              <T fr="Aucune notification." en="No notifications." />
            </div>
          )}
        </div>

        {/* Sidebar: channels & alert types */}
        <div>
          {/* Channels */}
          <div className="card">
            <h4 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 17, margin: "0 0 16px" }}>
              <T fr="Canaux" en="Channels" />
            </h4>
            {channelList.map((c, i) => (
              <div key={c.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none", fontSize: 13 }}>
                <span>{c.name || c.key}</span>
                <Toggle on={channels[c.key] ?? false} onChange={v => setChannels(prev => ({ ...prev, [c.key]: v }))} />
              </div>
            ))}
            {channelList.length === 0 && (
              <div style={{ color: "var(--muted)", fontSize: 13 }}><T fr="Aucun canal configure." en="No channels configured." /></div>
            )}
          </div>

          {/* Alert types */}
          <div className="card" style={{ marginTop: 12 }}>
            <h4 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 17, margin: "0 0 4px" }}>
              <T fr="Types d'alertes" en="Alert types" />
            </h4>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>
              <T fr="Choisissez ce que vous voulez recevoir" en="Choose what you want to receive" />
            </p>
            {alertTypeList.map((c, i) => (
              <div key={c.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none", fontSize: 12 }}>
                <span><T fr={c.fr || c.label_fr || c.key} en={c.en || c.label_en || c.key} /></span>
                <Toggle on={alerts[c.key] ?? false} onChange={v => setAlerts(prev => ({ ...prev, [c.key]: v }))} />
              </div>
            ))}
            {alertTypeList.length === 0 && (
              <div style={{ color: "var(--muted)", fontSize: 12 }}><T fr="Aucun type d'alerte." en="No alert types." /></div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
