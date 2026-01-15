export default function KeyFigures() {
  const figures = [
    { value: "10+", label: "Années d'Expérience" },
    { value: "5000+", label: "Tonnes Transportées" },
    { value: "500+", label: "Projets Réalisés" },
    { value: "2000+", label: "Clients Servis" },
  ];

  return (
    <section className="bg-white py-12 border-b border-slate-100">
      <div className="px-6 lg:px-40 mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {figures.map((figure, index) => (
            <div
              key={index}
              className="flex flex-col items-center justify-center text-center"
            >
              <span className="text-4xl font-black text-primary mb-1">
                {figure.value}
              </span>
              <span className="text-sm font-bold uppercase tracking-wider text-slate-500">
                {figure.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
