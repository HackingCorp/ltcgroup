import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 py-16 border-t border-slate-800">
      <div className="px-6 lg:px-40 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Column */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-white mb-2">
              <span className="material-symbols-outlined text-primary">
                language
              </span>
              <h3 className="text-xl font-black">LTC GROUP</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Un conglomérat multisectoriel qui stimule l&apos;innovation et la
              croissance au Cameroun et au-delà. Nous nous engageons pour
              l&apos;excellence dans chaque entreprise.
            </p>
            <div className="flex gap-4 mt-2">
              <a
                href="#"
                className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors text-white"
                aria-label="Facebook"
              >
                <span className="material-symbols-outlined text-[18px]">
                  public
                </span>
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors text-white"
                aria-label="LinkedIn"
              >
                <span className="material-symbols-outlined text-[18px]">
                  share
                </span>
              </a>
              <a
                href="mailto:contact@ltc-group.com"
                className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors text-white"
                aria-label="Email"
              >
                <span className="material-symbols-outlined text-[18px]">
                  mail
                </span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-4">
            <h4 className="text-white font-bold text-lg">Liens Rapides</h4>
            <ul className="flex flex-col gap-2 text-sm">
              <li>
                <Link href="#about" className="hover:text-primary transition-colors">
                  À Propos
                </Link>
              </li>
              <li>
                <Link href="#subsidiaries" className="hover:text-primary transition-colors">
                  Nos Filiales
                </Link>
              </li>
              <li>
                <Link href="#why-us" className="hover:text-primary transition-colors">
                  Pourquoi Nous
                </Link>
              </li>
              <li>
                <Link href="#testimonials" className="hover:text-primary transition-colors">
                  Témoignages
                </Link>
              </li>
              <li>
                <Link href="#contact" className="hover:text-primary transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-primary transition-colors">
                  Carrières
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="flex flex-col gap-4">
            <h4 className="text-white font-bold text-lg">Nous Contacter</h4>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex gap-3 items-start">
                <span className="material-symbols-outlined text-primary shrink-0">
                  location_on
                </span>
                <div>
                  <strong className="text-white block">Yaoundé – Mvan</strong>
                  <span className="text-slate-400">
                    Descente entrée Complexe BEAC
                  </span>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="material-symbols-outlined text-primary shrink-0">
                  location_city
                </span>
                <div>
                  <strong className="text-white block">Douala – Ndokotti</strong>
                  <span className="text-slate-400">
                    Immeuble Saker CCC, 2e étage
                  </span>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="material-symbols-outlined text-primary shrink-0">
                  call
                </span>
                <div className="flex flex-col text-slate-400">
                  <a href="tel:+237691371922" className="hover:text-primary">+237 691 371 922</a>
                  <a href="tel:+237693530491" className="hover:text-primary">+237 693 530 491</a>
                  <a href="tel:+237694562409" className="hover:text-primary">+237 694 562 409</a>
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <span className="material-symbols-outlined text-primary shrink-0">
                  mail
                </span>
                <span className="text-slate-400">contact@ltcgroup.site</span>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="flex flex-col gap-4">
            <h4 className="text-white font-bold text-lg">Newsletter</h4>
            <p className="text-sm text-slate-400">
              Abonnez-vous pour recevoir nos dernières actualités et mises à
              jour.
            </p>
            <form className="flex flex-col gap-2">
              <input
                className="w-full h-10 px-3 rounded bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-primary text-sm"
                placeholder="Votre adresse email"
                type="email"
              />
              <button
                className="w-full h-10 rounded bg-primary hover:bg-primary-dark text-white font-bold text-sm transition-colors"
                type="submit"
              >
                S&apos;abonner
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 text-center text-sm text-slate-500 flex flex-col md:flex-row justify-between items-center">
          <p>© {currentYear} LTC GROUP SARL. Tous droits réservés.</p>
          <div className="flex gap-4 mt-2 md:mt-0">
            <Link href="#" className="hover:text-primary transition-colors">
              Mentions Légales
            </Link>
            <Link href="#" className="hover:text-primary transition-colors">
              Politique de Confidentialité
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
