"use client";

import { useState } from "react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'envoi");
      }

      setStatus("success");
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Une erreur est survenue");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (status === "error") setStatus("idle");
  };

  return (
    <section className="py-20 bg-background-light" id="contact">
      <div className="px-6 lg:px-40 mx-auto">
        <div className="text-center mb-12">
          <span className="text-primary font-bold tracking-widest uppercase text-sm">
            Contactez-Nous
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-2">
            Restons en Contact
          </h2>
          <p className="text-slate-600 mt-4 max-w-2xl mx-auto">
            Une question, un projet ou une demande de partenariat ? Notre équipe
            est à votre écoute.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="flex flex-col gap-8">
            {/* Yaoundé Office */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">location_on</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Yaoundé – Mvan
                </h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                Mvan, descente entrée Complexe BEAC.<br />
                En venant du Carrefour Mvan, juste avant le ravin, à droite.<br />
                Immeuble carrelé avec la plaque LTC Group au balcon.
              </p>
              <div className="flex gap-4 mt-3 text-sm">
                <a href="tel:+237691371922" className="text-primary font-semibold hover:underline">691 371 922</a>
                <a href="tel:+237693530491" className="text-primary font-semibold hover:underline">693 530 491</a>
              </div>
            </div>

            {/* Douala Office */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">location_city</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Douala – Ndokotti
                </h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                Immeuble Saker CCC, deuxième étage.<br />
                Vous verrez la plaque LTC Group.
              </p>
              <div className="mt-3 text-sm">
                <a href="tel:+237694562409" className="text-primary font-semibold hover:underline">694 562 409</a>
              </div>
            </div>

            {/* Contact Details */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Coordonnées
              </h3>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">
                    call
                  </span>
                  <div className="flex flex-col text-slate-600 text-sm">
                    <a href="tel:+237691371922" className="hover:text-primary">+237 691 371 922</a>
                    <a href="tel:+237693530491" className="hover:text-primary">+237 693 530 491</a>
                    <a href="tel:+237694562409" className="hover:text-primary">+237 694 562 409</a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">
                    chat
                  </span>
                  <a href="https://wa.me/237691371922" className="text-slate-600 hover:text-primary text-sm">
                    WhatsApp: +237 691 371 922
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">
                    mail
                  </span>
                  <span className="text-slate-600 text-sm">contact@ltcgroup.site</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-6">
              Envoyez-nous un Message
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Votre nom"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full h-12 px-4 rounded-lg bg-background-light border border-slate-200 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-primary text-sm"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Votre email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full h-12 px-4 rounded-lg bg-background-light border border-slate-200 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-primary text-sm"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="tel"
                  name="phone"
                  placeholder="Téléphone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full h-12 px-4 rounded-lg bg-background-light border border-slate-200 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-primary text-sm"
                />
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full h-12 px-4 rounded-lg bg-background-light border border-slate-200 text-slate-900 focus:outline-none focus:border-primary text-sm"
                >
                  <option value="">Sujet</option>
                  <option value="logistics">Logistique / Import-Export</option>
                  <option value="btp">BTP / Construction</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="digital">Services Digitaux</option>
                  <option value="finance">Solutions Financières</option>
                  <option value="partnership">Partenariat</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <textarea
                name="message"
                placeholder="Votre message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={5}
                className="w-full px-4 py-3 rounded-lg bg-background-light border border-slate-200 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-primary text-sm resize-none"
              ></textarea>
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full h-12 rounded-lg bg-primary hover:bg-primary-dark text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === "loading" ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    Envoi en cours...
                  </>
                ) : (
                  "Envoyer le Message"
                )}
              </button>

              {status === "success" && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600">check_circle</span>
                  Merci ! Votre message a été envoyé avec succès. Nous vous répondrons bientôt.
                </div>
              )}

              {status === "error" && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-600">error</span>
                  {errorMessage}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
