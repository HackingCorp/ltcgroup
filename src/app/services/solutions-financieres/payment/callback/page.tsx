"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "failed" | "cancelled">("loading");
  const [orderSent, setOrderSent] = useState(false);

  useEffect(() => {
    // E-nkap returns status in query params
    const paymentStatus = searchParams.get("status");

    let finalStatus: "success" | "failed" | "cancelled" = "success";

    if (paymentStatus) {
      if (paymentStatus.toUpperCase() === "COMPLETED" || paymentStatus.toUpperCase() === "SUCCESS") {
        finalStatus = "success";
      } else if (paymentStatus.toUpperCase() === "CANCELLED") {
        finalStatus = "cancelled";
      } else {
        finalStatus = "failed";
      }
    }

    setStatus(finalStatus);

    // Send order notification only on success
    const sendOrderNotification = async () => {
      if (orderSent) return;
      if (finalStatus !== "success") {
        // Don't send order notification on failed/cancelled payment
        sessionStorage.removeItem("pendingOrder");
        return;
      }

      try {
        const pendingOrderStr = sessionStorage.getItem("pendingOrder");
        if (!pendingOrderStr) return;

        const pendingOrder = JSON.parse(pendingOrderStr);

        const response = await fetch("/api/send-card-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...pendingOrder,
            paymentStatus: "SUCCESS",
            paymentMethod: "enkap",
          }),
        });

        if (response.ok) {
          sessionStorage.removeItem("pendingOrder");
          setOrderSent(true);
        }
      } catch (error) {
        console.error("Failed to send order notification:", error);
      }
    };

    sendOrderNotification();
  }, [searchParams, orderSent]);

  return (
    <div className="bg-[#10151e] text-white font-sans antialiased min-h-screen flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        {status === "loading" && (
          <div>
            <div className="w-16 h-16 mx-auto mb-6 border-4 border-[#cea427] border-t-transparent rounded-full animate-spin"></div>
            <h1 className="text-2xl font-bold mb-4">Vérification du paiement...</h1>
            <p className="text-gray-400">Veuillez patienter</p>
          </div>
        )}

        {status === "success" && (
          <div>
            <div className="w-20 h-20 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-green-500 text-5xl">check_circle</span>
            </div>
            <h1 className="text-2xl font-bold mb-4 text-green-500">Paiement réussi !</h1>
            <p className="text-gray-300 mb-6">
              Votre paiement a été traité avec succès. Notre équipe vous contactera dans les 24 heures pour finaliser votre commande.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-400 mb-2">Référence de commande</p>
              <p className="text-lg font-bold text-[#cea427]">
                {searchParams.get("merchant_reference") || searchParams.get("order_id") || "N/A"}
              </p>
            </div>
            <div className="space-y-3">
              <Link
                href="/services/solutions-financieres"
                className="block w-full py-3 px-6 bg-[#cea427] text-[#10151e] font-bold rounded-xl hover:bg-[#b8931f] transition-colors"
              >
                Retour à l&apos;accueil
              </Link>
              <a
                href="https://wa.me/237673209375"
                className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">chat</span>
                Nous contacter sur WhatsApp
              </a>
            </div>
          </div>
        )}

        {status === "failed" && (
          <div>
            <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-red-500 text-5xl">error</span>
            </div>
            <h1 className="text-2xl font-bold mb-4 text-red-500">Paiement échoué</h1>
            <p className="text-gray-300 mb-6">
              Le paiement n&apos;a pas pu être traité. Veuillez réessayer ou contacter notre équipe pour assistance.
            </p>
            <div className="space-y-3">
              <Link
                href="/services/solutions-financieres#order-form"
                className="block w-full py-3 px-6 bg-[#cea427] text-[#10151e] font-bold rounded-xl hover:bg-[#b8931f] transition-colors"
              >
                Réessayer
              </Link>
              <a
                href="https://wa.me/237673209375"
                className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">chat</span>
                Contacter le support
              </a>
            </div>
          </div>
        )}

        {status === "cancelled" && (
          <div>
            <div className="w-20 h-20 mx-auto mb-6 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-yellow-500 text-5xl">warning</span>
            </div>
            <h1 className="text-2xl font-bold mb-4 text-yellow-500">Paiement annulé</h1>
            <p className="text-gray-300 mb-6">
              Vous avez annulé le paiement. Vous pouvez réessayer à tout moment.
            </p>
            <div className="space-y-3">
              <Link
                href="/services/solutions-financieres#order-form"
                className="block w-full py-3 px-6 bg-[#cea427] text-[#10151e] font-bold rounded-xl hover:bg-[#b8931f] transition-colors"
              >
                Réessayer
              </Link>
              <Link
                href="/services/solutions-financieres"
                className="block w-full py-3 px-6 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors"
              >
                Retour à l&apos;accueil
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#10151e] text-white font-sans antialiased min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 border-4 border-[#cea427] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400">Chargement...</p>
          </div>
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
