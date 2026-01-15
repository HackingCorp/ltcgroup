import Link from "next/link";

export default function CTA() {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-corporate-blue"></div>
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("https://www.transparenttextures.com/patterns/cubes.png")`,
        }}
      ></div>

      <div className="relative z-10 px-6 lg:px-40 mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
          Prêt à démarrer votre prochain projet avec nous ?
        </h2>
        <p className="text-slate-300 mb-10 max-w-2xl mx-auto text-lg">
          Que ce soit en logistique, construction ou commerce digital, LTC Group
          a l&apos;expertise pour concrétiser votre vision.
        </p>
        <Link
          href="#contact"
          className="inline-flex items-center justify-center rounded-lg h-14 px-10 bg-primary hover:bg-primary-dark text-white text-lg font-bold transition-all shadow-lg hover:shadow-red-900/50"
        >
          Contactez-Nous
        </Link>
      </div>
    </section>
  );
}
