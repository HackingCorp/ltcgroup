"use client";

import Image from "next/image";
import { useLanguage } from "@/i18n";

export default function About() {
  const { t } = useLanguage();

  return (
    <section className="py-20 bg-background-light" id="about">
      <div className="px-6 lg:px-40 mx-auto">
        <div className="flex flex-col lg:flex-row gap-16 items-start">
          <div className="flex flex-col gap-6 flex-1">
            <span className="text-primary font-bold tracking-widest uppercase text-sm">
              {t.about.tag}
            </span>
            <h2 className="text-4xl font-black text-slate-900 leading-tight">
              {t.about.title}
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              {t.about.description}
            </p>

            <div className="grid gap-6 mt-4">
              {/* Vision */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white shadow-sm border border-slate-100 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">visibility</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    {t.about.vision}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {t.about.visionText}
                  </p>
                </div>
              </div>

              {/* Mission */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white shadow-sm border border-slate-100 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">ads_click</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    {t.about.mission}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {t.about.missionText}
                  </p>
                </div>
              </div>

              {/* Values */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white shadow-sm border border-slate-100 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">diamond</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    {t.about.values}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {t.about.valuesText}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full relative">
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <Image
                alt="LTC Group Team"
                className="object-cover w-full h-full"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-S7QJOK4Cz18t0D8Dr5PB3Olpq4IrUurxSeqFl4gWBTVq8WSNFsyV7g9cQiWMhrBkI-lUvQYTotF3NlG-yn7dBGvzr4JGnIITzSiVc7m9UAiV8TM9EckLgrfkqB41cI4sXQsLn0x99V16u-asQy4g2WTe4HtdMVdsYNxH19c3DBZEV4cdyIZx5onUlLVZBJZoAcGgbC3KE2mGSV23FB0jcuuYijDvNxNjgshRQgRHl22i4Wp5ACgicrcynPyMBly8SlIN4wBoCz5s"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-corporate-blue/60 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border-l-4 border-primary">
                  <p className="text-slate-900 font-bold italic">
                    &quot;{t.about.quote}&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
