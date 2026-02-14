"use client";

import { useLanguage } from "@/i18n";

export default function WhyUs() {
  const { t } = useLanguage();

  const reasons = [
    {
      icon: "hub",
      ...t.whyUs.expertise,
    },
    {
      icon: "public",
      ...t.whyUs.presence,
    },
    {
      icon: "groups",
      ...t.whyUs.team,
    },
    {
      icon: "integration_instructions",
      ...t.whyUs.solutions,
    },
  ];

  return (
    <section className="py-20 bg-background-light" id="why-us">
      <div className="px-6 lg:px-40 mx-auto">
        <div className="text-center mb-12">
          <span className="text-primary font-bold tracking-widest uppercase text-sm">
            {t.whyUs.tag}
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-2">
            {t.whyUs.title}
          </h2>
          <p className="text-slate-600 mt-4 max-w-2xl mx-auto">
            {t.whyUs.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {reasons.map((reason, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-lg transition-shadow"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                <span className="material-symbols-outlined text-[32px]">
                  {reason.icon}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {reason.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
