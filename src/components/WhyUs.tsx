export default function WhyUs() {
  const reasons = [
    {
      icon: "hub",
      title: "Expertise Multisectorielle",
      description:
        "Une maîtrise complète de plusieurs secteurs clés: logistique, BTP, e-commerce, services digitaux et financiers.",
    },
    {
      icon: "public",
      title: "Présence Internationale",
      description:
        "Des opérations établies au Cameroun, en Afrique et en Chine pour servir nos clients à l'échelle mondiale.",
    },
    {
      icon: "groups",
      title: "Équipe Professionnelle",
      description:
        "Des experts qualifiés et dévoués qui mettent leur savoir-faire au service de votre réussite.",
    },
    {
      icon: "integration_instructions",
      title: "Solutions Intégrées",
      description:
        "Un écosystème complet où chaque filiale travaille en synergie pour offrir des solutions bout-en-bout.",
    },
  ];

  return (
    <section className="py-20 bg-background-light" id="why-us">
      <div className="px-6 lg:px-40 mx-auto">
        <div className="text-center mb-12">
          <span className="text-primary font-bold tracking-widest uppercase text-sm">
            Nos Avantages
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-2">
            Pourquoi Choisir LTC Group ?
          </h2>
          <p className="text-slate-600 mt-4 max-w-2xl mx-auto">
            Des raisons concrètes qui font de nous le partenaire idéal pour vos
            projets en Afrique et à l&apos;international.
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
