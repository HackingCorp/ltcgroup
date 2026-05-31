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
import { T, useLang, LangProvider } from "@/lib/i18n";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

function MerchantLoginContent() {
  const [isLoading, setIsLoading] = useState(false);
  const { merchantLogin } = useAuth();
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
      await merchantLogin(data);
      toast.success("Welcome back!");
      router.push("/merchant/dashboard");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Login failed"
          : "Login failed";
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
          <T fr={<>Reprenez où vous <span style={{ background: "var(--accent)", color: "var(--ink)", padding: "0 6px", borderRadius: 6 }}>vous étiez</span>.</>}
             en={<>Pick up <span style={{ background: "var(--accent)", color: "var(--ink)", padding: "0 6px", borderRadius: 6 }}>where you left off</span>.</>} />
        </h2>
        <p style={{ color: "rgba(250,250,247,0.6)", fontSize: 14, maxWidth: 360, lineHeight: 1.5, marginBottom: 32 }}>
          <T fr="Votre dashboard marchand vous attend. Transactions, liens de paiement, API."
             en="Your merchant dashboard awaits. Transactions, payment links, API." />
        </p>

        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 20, backdropFilter: "blur(8px)" }}>
          <div style={{ fontFamily: "var(--display)", fontSize: 16, lineHeight: 1.45 }}>
            <T fr={"« Intégré en une après-midi. Notre chiffre d'affaires en ligne a doublé en 6 semaines. »"}
               en={'“Integrated in one afternoon. Our online revenue doubled in 6 weeks.”'} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, fontSize: 12, color: "rgba(250,250,247,0.6)" }}>
            <Avatar name="Marie K" size={28} color="var(--accent)" />
            <span>Marie K. — CEO, Boutique Mami</span>
          </div>
        </div>
      </aside>

      <section style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="auth-form-wrap">
          <h1 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 36, letterSpacing: "-0.025em", lineHeight: 1.05, margin: "0 0 8px" }}>
            <T fr="Bon retour." en="Welcome back." />
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 28px", lineHeight: 1.45 }}>
            <T fr="Connectez-vous à votre dashboard Nkap Pay." en="Sign in to your Nkap Pay dashboard." />
          </p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input
              id="email"
              label={lang === "en" ? "Work email" : "Email professionnel"}
              type="email"
              placeholder="contact@mamishop.cm"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              id="password"
              label={lang === "en" ? "Password" : "Mot de passe"}
              type="password"
              placeholder={"•".repeat(12)}
              error={errors.password?.message}
              {...register("password")}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, fontSize: 12, color: "var(--muted)" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" defaultChecked />
                <T fr="Se souvenir de moi" en="Remember me" />
              </label>
              <Link href="/merchant/forgot-password" style={{ color: "var(--primary)", textDecoration: "none" }}>
                <T fr="Mot de passe oublié ?" en="Forgot password?" />
              </Link>
            </div>

            <Button type="submit" variant="primary" size="lg" isLoading={isLoading} style={{ marginTop: 8, justifyContent: "center", width: "100%" }}>
              <T fr="Se connecter" en="Sign in" /> <Icon name="arrow" size={14} color="white" />
            </Button>
          </form>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center", margin: "20px 0", color: "var(--muted-2)", fontSize: 11 }}>
            <hr style={{ border: 0, borderTop: "1px solid var(--line)" }} />
            <span><T fr="OU" en="OR" /></span>
            <hr style={{ border: 0, borderTop: "1px solid var(--line)" }} />
          </div>

          <Button variant="ghost" style={{ width: "100%", justifyContent: "center" }}>
            <Icon name="lock" size={14} /> <T fr="Code de récupération" en="Recovery code" />
          </Button>

          <div style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 20 }}>
            <T fr="Pas encore de compte ? " en="Don't have an account? " />
            <Link href="/merchant/register" style={{ color: "var(--primary)", fontWeight: 500, textDecoration: "none" }}>
              <T fr="Créer un compte" en="Sign up" />
            </Link>
          </div>

          <div style={{ textAlign: "center", marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <Link href="/auth/login" style={{ color: "var(--muted)", fontSize: 12, textDecoration: "none" }}>
              <T fr="Accès admin" en="Admin login" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function MerchantLoginPage() {
  return (
    <LangProvider>
      <MerchantLoginContent />
    </LangProvider>
  );
}
