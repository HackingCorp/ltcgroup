"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Button, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { authService } from "@/services/auth.service";
import { T, useLang } from "@/lib/i18n";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordForm = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { lang } = useLang();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    try {
      await authService.forgotPassword(data.email);
      setSent(true);
      toast.success("Reset link sent to your email");
    } catch {
      toast.error("Failed to send reset link");
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
        @media (max-width: 768px) {
          .auth-grid { grid-template-columns: 1fr !important; }
          .auth-side { display: none !important; }
          .auth-form-wrap { padding: 32px 24px; }
        }
      `}</style>

      <aside className="auth-side">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", color: "var(--bg)" }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--bg)", color: "var(--accent)", display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 14 }}>N</span>
          <span style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 17 }}>Nkap Pay</span>
        </Link>
        <h2 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 40, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "auto 0 16px" }}>
          <T fr={<>Pas de panique. <br /><span style={{ background: "var(--accent)", color: "var(--ink)", padding: "0 6px", borderRadius: 6 }}>{"\u00c7"}a arrive.</span></>}
             en={<>No worries. <br /><span style={{ background: "var(--accent)", color: "var(--ink)", padding: "0 6px", borderRadius: 6 }}>It happens.</span></>} />
        </h2>
      </aside>

      <section style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="auth-form-wrap">
          {!sent ? (
            <>
              <h1 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 36, letterSpacing: "-0.025em", lineHeight: 1.05, margin: "0 0 8px" }}>
                <T fr="R\u00e9initialiser le mot de passe" en="Reset your password" />
              </h1>
              <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 28px", lineHeight: 1.45 }}>
                <T fr="Saisissez votre email et nous vous enverrons un lien s\u00e9curis\u00e9." en="Enter your email and we'll send you a secure link." />
              </p>
              <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Input
                  id="email"
                  label={lang === "en" ? "Account email" : "Email du compte"}
                  type="email"
                  placeholder="admin@nkap.pay"
                  error={errors.email?.message}
                  {...register("email")}
                />
                <Button type="submit" variant="primary" size="lg" isLoading={isLoading} style={{ marginTop: 8, justifyContent: "center", width: "100%" }}>
                  <T fr="Envoyer le lien" en="Send reset link" /> <Icon name="send" size={14} color="white" />
                </Button>
              </form>
              <div style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 16 }}>
                <Link href="/auth/login" style={{ color: "var(--primary)", textDecoration: "none" }}>
                  {"\u2190"} <T fr="Retour \u00e0 la connexion" en="Back to sign in" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <div style={{ background: "var(--success-soft)", borderRadius: 12, padding: 20, marginBottom: 20, display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--success)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Icon name="check" size={16} color="white" />
                </div>
                <div>
                  <strong style={{ display: "block", marginBottom: 4 }}><T fr="Email envoy\u00e9 !" en="Email sent!" /></strong>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5 }}>
                    <T fr="V\u00e9rifiez votre bo\u00eete de r\u00e9ception. Le lien expire dans 30 minutes." en="Check your inbox. The link expires in 30 minutes." />
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="lg" onClick={() => setSent(false)} style={{ width: "100%", justifyContent: "center" }}>
                <T fr="Renvoyer le lien" en="Resend link" />
              </Button>
              <div style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 16 }}>
                <Link href="/auth/login" style={{ color: "var(--primary)", textDecoration: "none" }}>
                  {"\u2190"} <T fr="Retour \u00e0 la connexion" en="Back to sign in" />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
