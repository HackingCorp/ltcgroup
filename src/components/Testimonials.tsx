"use client";

import { useLanguage } from "@/i18n";

export default function Testimonials() {
  const { t } = useLanguage();

  const partners = [
    "DHL",
    "Maersk",
    "China Shipping",
    "Orange Money",
    "MTN MoMo",
    "Express Union",
  ];

  return (
    <section className="py-20 bg-white" id="testimonials">
      <div className="px-6 lg:px-40 mx-auto">
        <div className="text-center mb-12">
          <span className="text-primary font-bold tracking-widest uppercase text-sm">
            {t.testimonials.tag}
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-2">
            {t.testimonials.title}
          </h2>
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {t.testimonials.items.map((testimonial, index) => (
            <div
              key={index}
              className="bg-background-light p-6 rounded-xl border border-slate-100"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">
                    {testimonial.name}
                  </h4>
                  <p className="text-sm text-slate-500">{testimonial.role}</p>
                </div>
              </div>
              <p className="text-slate-600 italic leading-relaxed">
                &quot;{testimonial.content}&quot;
              </p>
            </div>
          ))}
        </div>

        {/* Partners */}
        <div className="border-t border-slate-100 pt-12">
          <p className="text-center text-sm font-bold uppercase tracking-widest text-slate-500 mb-8">
            {t.testimonials.partners}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {partners.map((partner, index) => (
              <span
                key={index}
                className="text-xl font-bold text-slate-400 hover:text-primary transition-colors"
              >
                {partner}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
