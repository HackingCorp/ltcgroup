"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Button, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { T, useLang } from "@/lib/i18n";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { lang, setLang } = useLang();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      toast.error(message);
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
          <T fr={<>Administration <span style={{ background: "var(--accent)", color: "var(--ink)", padding: "0 6px", borderRadius: 6 }}>plateforme</span>.</>}
             en={<>Platform <span style={{ background: "var(--accent)", color: "var(--ink)", padding: "0 6px", borderRadius: 6 }}>administration</span>.</>} />
        </h2>
        <p style={{ color: "rgba(250,250,247,0.6)", fontSize: 14, maxWidth: 360, lineHeight: 1.5, marginBottom: 32 }}>
          <T fr="Accédez au dashboard admin pour gérer les marchands, les transactions et la plateforme."
             en="Access the admin dashboard to manage merchants, transactions and the platform." />
        </p>
      </aside>

      <section style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="auth-form-wrap">
          <h1 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 36, letterSpacing: "-0.025em", lineHeight: 1.05, margin: "0 0 8px" }}>
            <T fr="Connexion admin" en="Admin login" />
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 28px", lineHeight: 1.45 }}>
            <T fr="Connectez-vous au dashboard d'administration Nkap Pay." en="Sign in to the Nkap Pay administration dashboard." />
          </p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="admin@nkap.pay"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              id="password"
              label={lang === "en" ? "Password" : "Mot de passe"}
              type="password"
              placeholder="Enter your password"
              error={errors.password?.message}
              {...register("password")}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, fontSize: 12, color: "var(--muted)" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" defaultChecked />
                <T fr="Se souvenir de moi" en="Remember me" />
              </label>
              <Link href="/auth/forgot-password" style={{ color: "var(--primary)", textDecoration: "none" }}>
                <T fr="Mot de passe oublié ?" en="Forgot password?" />
              </Link>
            </div>

            <Button type="submit" variant="primary" size="lg" isLoading={isLoading} style={{ marginTop: 8, justifyContent: "center", width: "100%" }}>
              <T fr="Se connecter" en="Sign in" /> <Icon name="arrow" size={14} color="white" />
            </Button>
          </form>

          <div style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 24 }}>
            <T fr="Accès marchand ? " en="Merchant access? " />
            <Link href="/merchant/login" style={{ color: "var(--primary)", fontWeight: 500, textDecoration: "none" }}>
              <T fr="Portail marchand" en="Merchant portal" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
