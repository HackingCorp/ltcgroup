"use client";

import Link from "next/link";
import { useLanguage } from "@/i18n";

export default function Subsidiaries() {
  const { t } = useLanguage();

  const subsidiaries = [
    {
      ...t.subsidiaries.emarket,
      icon: "shopping_cart",
      href: "#", // TODO: /services/emarket-237
    },
    {
      ...t.subsidiaries.cargo,
      icon: "local_shipping",
      href: "/services/global-cargo",
    },
    {
      ...t.subsidiaries.panda,
      icon: "storefront",
      href: "#", // TODO: /services/panda-market
    },
    {
      ...t.subsidiaries.btp,
      icon: "engineering",
      href: "/services/lnd-btp",
    },
    {
      ...t.subsidiaries.delivery,
      icon: "two_wheeler",
      href: "#", // TODO: /services/go-livraison
    },
    {
      ...t.subsidiaries.host,
      icon: "dns",
      href: "#", // TODO: /services/ltc-host
    },
    {
      ...t.subsidiaries.finance,
      icon: "credit_card",
      href: "#", // TODO: /services/solutions-financieres
    },
    {
      ...t.subsidiaries.immo,
      icon: "apartment",
      href: "#", // TODO: /services/ltc-immo
    },
  ];

  return (
    <section className="py-20 bg-white" id="subsidiaries">
      <div className="px-6 lg:px-40 mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <span className="text-primary font-bold tracking-widest uppercase text-sm">
              {t.subsidiaries.tag}
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-2">
              {t.subsidiaries.title}
            </h2>
          </div>
          <p className="text-slate-600 max-w-md text-right md:text-left">
            {t.subsidiaries.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {subsidiaries.map((subsidiary, index) => (
            <div
              key={index}
              className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-[80px] text-primary">
                  {subsidiary.icon}
                </span>
              </div>
              <div>
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <span className="material-symbols-outlined">
                    {subsidiary.icon}
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-slate-900">
                  {subsidiary.name}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  {subsidiary.description}
                </p>
              </div>
              <Link
                href={subsidiary.href}
                className="mt-6 flex items-center gap-2 text-sm font-bold text-primary group-hover:underline"
              >
                {subsidiary.link}{" "}
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
