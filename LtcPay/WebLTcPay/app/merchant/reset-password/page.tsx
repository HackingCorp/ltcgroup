"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Button, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { merchantAuthService } from "@/services/merchant-auth.service";
import { T, useLang, LangProvider } from "@/lib/i18n";

const schema = z
  .object({
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof schema>;

function ResetPasswordContent() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { lang } = useLang();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      toast.error("Token de réinitialisation manquant");
      return;
    }
    setIsLoading(true);
    try {
      await merchantAuthService.resetPassword(token, data.password);
      toast.success(lang === "en" ? "Password reset successfully" : "Mot de passe réinitialisé avec succès");
      router.push("/merchant/login");
    } catch {
      toast.error(lang === "en" ? "Invalid or expired token" : "Token invalide ou expiré");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "100vh", background: "var(--bg)" }}>
      <style>{`
        .auth-side { background: var(--ink); color: var(--bg); padding: 48px; display: flex; flex-direction: column; position: relative; overflow: hidden; }
        .auth-side::after { content: ""; position: absolute; right: -100px; bottom: -100px; width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle, rgba(201,255,61,0.18), transparent 70%); pointer-events: none; }
        .auth-form-wrap { padding: 64px 56px; max-width: 480px; width: 100%; align-self: center; margin: 0 auto; }
        @media (max-width: 768px) { .auth-side { display: none !important; } .auth-form-wrap { padding: 32px 24px; } }
      `}</style>

      <aside className="auth-side">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", color: "var(--bg)" }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--bg)", color: "var(--accent)", display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 14 }}>N</span>
          <span style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 17 }}>Nkap Pay</span>
        </Link>
        <h2 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 40, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "auto 0 16px" }}>
          <T fr={<>Choisissez un <span style={{ background: "var(--accent)", color: "var(--ink)", padding: "0 6px", borderRadius: 6 }}>nouveau</span> mot de passe.</>}
             en={<>Choose a <span style={{ background: "var(--accent)", color: "var(--ink)", padding: "0 6px", borderRadius: 6 }}>new</span> password.</>} />
        </h2>
      </aside>

      <section style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="auth-form-wrap">
          {!token ? (
            <>
              <h1 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 36, letterSpacing: "-0.025em", lineHeight: 1.05, margin: "0 0 8px" }}>
                <T fr="Lien invalide" en="Invalid link" />
              </h1>
              <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 28px", lineHeight: 1.45 }}>
                <T fr="Le lien de réinitialisation est invalide ou a expiré." en="The reset link is invalid or has expired." />
              </p>
              <Link href="/merchant/forgot-password">
                <Button variant="primary" size="lg" style={{ width: "100%", justifyContent: "center" }}>
                  <T fr="Demander un nouveau lien" en="Request a new link" />
                </Button>
              </Link>
            </>
          ) : (
            <>
              <h1 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 36, letterSpacing: "-0.025em", lineHeight: 1.05, margin: "0 0 8px" }}>
                <T fr="Nouveau mot de passe" en="New password" />
              </h1>
              <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 28px", lineHeight: 1.45 }}>
                <T fr="Choisissez un nouveau mot de passe pour votre compte." en="Choose a new password for your account." />
              </p>
              <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Input
                  id="password"
                  label={lang === "en" ? "New password" : "Nouveau mot de passe"}
                  type="password"
                  placeholder={lang === "en" ? "Min. 8 characters" : "Min. 8 caractères"}
                  error={errors.password?.message}
                  {...register("password")}
                />
                <Input
                  id="confirmPassword"
                  label={lang === "en" ? "Confirm password" : "Confirmer le mot de passe"}
                  type="password"
                  placeholder={lang === "en" ? "Repeat the password" : "Répétez le mot de passe"}
                  error={errors.confirmPassword?.message}
                  {...register("confirmPassword")}
                />
                <Button type="submit" variant="primary" size="lg" isLoading={isLoading} style={{ marginTop: 8, justifyContent: "center", width: "100%" }}>
                  <T fr="Réinitialiser" en="Reset password" /> <Icon name="lock" size={14} color="white" />
                </Button>
              </form>
              <div style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 16 }}>
                <Link href="/merchant/login" style={{ color: "var(--primary)", textDecoration: "none" }}>
                  {"←"} <T fr="Retour à la connexion" en="Back to sign in" />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default function MerchantResetPasswordPage() {
  return (
    <LangProvider>
      <Suspense fallback={
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--muted)" }}>Chargement...</div>
        </div>
      }>
        <ResetPasswordContent />
      </Suspense>
    </LangProvider>
  );
}
