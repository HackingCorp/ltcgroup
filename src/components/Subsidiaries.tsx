import Link from "next/link";

interface Subsidiary {
  name: string;
  description: string;
  icon: string;
  link: string;
  linkText: string;
}

const subsidiaries: Subsidiary[] = [
  {
    name: "E-Market 237",
    description:
      "Plateforme e-commerce leader proposant produits électroniques, accessoires, maison et tech. Une expérience d'achat en ligne fluide et sécurisée.",
    icon: "shopping_cart",
    link: "#",
    linkText: "Visiter la Boutique",
  },
  {
    name: "Global Cargo Logistics",
    description:
      "Solutions logistiques internationales Chine-Cameroun. Fret aérien & maritime, sourcing et paiement fournisseurs pour vos importations.",
    icon: "local_shipping",
    link: "#",
    linkText: "Solutions Logistiques",
  },
  {
    name: "Panda Market / SinoSourcing",
    description:
      "Plateforme de sourcing en Chine. Trouvez les meilleurs fournisseurs, négociez les prix et sécurisez vos approvisionnements.",
    icon: "storefront",
    link: "#",
    linkText: "Découvrir le Sourcing",
  },
  {
    name: "LND BTP",
    description:
      "Construction et BTP de qualité. Réalisation d'immeubles, études techniques et projets clé en main pour particuliers et entreprises.",
    icon: "engineering",
    link: "#",
    linkText: "Voir nos Projets",
  },
  {
    name: "Go Livraison",
    description:
      "Service de livraison locale rapide. Le dernier kilomètre assuré avec efficacité et ponctualité dans tout le Cameroun.",
    icon: "two_wheeler",
    link: "#",
    linkText: "Commander une Livraison",
  },
  {
    name: "LTC Host / Services Digitaux",
    description:
      "Hébergement web, solutions IT et automatisation. Propulsez votre présence digitale avec nos services technologiques de pointe.",
    icon: "dns",
    link: "#",
    linkText: "Services IT",
  },
  {
    name: "Solutions Financières",
    description:
      "Cartes Visa prépayées et services de paiement innovants. Facilitez vos transactions locales et internationales.",
    icon: "credit_card",
    link: "#",
    linkText: "En Savoir Plus",
  },
  {
    name: "LTC Immo",
    description:
      "Gestion immobilière complète, développement de propriétés et consultation pour actifs de haute valeur.",
    icon: "apartment",
    link: "#",
    linkText: "Voir les Propriétés",
  },
];

export default function Subsidiaries() {
  return (
    <section className="py-20 bg-white" id="subsidiaries">
      <div className="px-6 lg:px-40 mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <span className="text-primary font-bold tracking-widest uppercase text-sm">
              Notre Écosystème
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-2">
              Nos Filiales
            </h2>
          </div>
          <p className="text-slate-600 max-w-md text-right md:text-left">
            Découvrez les branches spécialisées de LTC GROUP offrant une
            expertise ciblée dans chaque secteur.
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
                href={subsidiary.link}
                className="mt-6 flex items-center gap-2 text-sm font-bold text-primary group-hover:underline"
              >
                {subsidiary.linkText}{" "}
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
