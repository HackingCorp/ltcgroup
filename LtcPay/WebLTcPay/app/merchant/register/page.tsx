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
import { merchantAuthService } from "@/services/merchant-auth.service";
import { T, useLang, LangProvider } from "@/lib/i18n";
import { Copy, Check } from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(1, "Business name is required").max(255),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  website: z.string().optional(),
  business_type: z.string().optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;

interface Credentials {
  api_key_live: string;
  api_key_test: string;
  api_secret: string;
  webhook_secret: string;
}

function MerchantRegisterContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const router = useRouter();
  const { lang } = useLang();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const result = await merchantAuthService.register(data);
      setCredentials(result.merchant);
      toast.success("Registration successful!");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Registration failed"
          : "Registration failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (credentials) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "100vh", background: "var(--bg)" }}>
        <style>{`
          .auth-side { background: var(--ink); color: var(--bg); padding: 48px; display: flex; flex-direction: column; position: relative; overflow: hidden; }
          .auth-side::after { content: ""; position: absolute; right: -100px; bottom: -100px; width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle, rgba(201,255,61,0.18), transparent 70%); pointer-events: none; }
          .auth-form-wrap { padding: 64px 56px; max-width: 520px; width: 100%; align-self: center; margin: 0 auto; }
          @media (max-width: 768px) { .auth-side { display: none !important; } .auth-form-wrap { padding: 32px 24px; } }
        `}</style>
        <aside className="auth-side">
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", color: "var(--bg)" }}>
            <span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--bg)", color: "var(--accent)", display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 14 }}>N</span>
            <span style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 17 }}>Nkap Pay</span>
          </Link>
          <h2 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 40, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "auto 0 16px" }}>
            <T fr={<>Bienvenue chez <span style={{ background: "var(--accent)", color: "var(--ink)", padding: "0 6px", borderRadius: 6 }}>Nkap Pay</span> !</>}
               en={<>Welcome to <span style={{ background: "var(--accent)", color: "var(--ink)", padding: "0 6px", borderRadius: 6 }}>Nkap Pay</span>!</>} />
          </h2>
        </aside>
        <section style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="auth-form-wrap">
            <div style={{ background: "var(--accent-soft)", borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent)", display: "grid", placeItems: "center" }}>
                  <Icon name="check" size={18} color="var(--ink)" />
                </div>
                <div>
                  <div style={{ fontWeight: 500 }}><T fr="Mode test activ\u00e9" en="Test mode active" /></div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}><T fr="Paiements test illimit\u00e9s" en="Unlimited test payments" /></div>
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "var(--rose)", fontWeight: 500, margin: "0 0 16px" }}>
              <T fr="Sauvegardez ces identifiants maintenant. Le secret API ne peut pas \u00eatre r\u00e9cup\u00e9r\u00e9." en="Save these credentials now. The API secret cannot be retrieved again." />
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Live API Key", value: credentials.api_key_live, field: "live" },
                { label: "Test API Key", value: credentials.api_key_test, field: "test" },
                { label: "API Secret", value: credentials.api_secret, field: "secret" },
                { label: "Webhook Secret", value: credentials.webhook_secret, field: "webhook" },
              ].map((item) => (
                <div key={item.field} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <code style={{ flex: 1, fontFamily: "var(--mono)", fontSize: 12, wordBreak: "break-all" }}>{item.value}</code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.value, item.field)}
                      style={{ appearance: "none", border: 0, background: "transparent", cursor: "pointer", padding: 4, color: "var(--muted)" }}
                    >
                      {copiedField === item.field ? <Check className="h-4 w-4" style={{ color: "var(--success)" }} /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="primary"
              size="lg"
              style={{ width: "100%", justifyContent: "space-between", marginTop: 20 }}
              onClick={() => router.push("/merchant/dashboard")}
            >
              <T fr="Aller au dashboard" en="Go to dashboard" /> <Icon name="arrow" size={14} color="white" />
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "100vh", background: "var(--bg)" }}>
      <style>{`
        .auth-side { background: var(--ink); color: var(--bg); padding: 48px; display: flex; flex-direction: column; position: relative; overflow: hidden; }
        .auth-side::after { content: ""; position: absolute; right: -100px; bottom: -100px; width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle, rgba(201,255,61,0.18), transparent 70%); pointer-events: none; }
        .auth-form-wrap { padding: 64px 56px; max-width: 520px; width: 100%; align-self: center; margin: 0 auto; }
        @media (max-width: 768px) { .auth-side { display: none !important; } .auth-form-wrap { padding: 32px 24px; } }
      `}</style>

      <aside className="auth-side">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", color: "var(--bg)" }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--bg)", color: "var(--accent)", display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 14 }}>N</span>
          <span style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 17 }}>Nkap Pay</span>
        </Link>

        <h2 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 40, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "auto 0 16px" }}>
          <T fr={<>Commencez <span style={{ background: "var(--accent)", color: "var(--ink)", padding: "0 6px", borderRadius: 6 }}>gratuitement</span>. Aucune pi\u00e8ce requise.</>}
             en={<>Start <span style={{ background: "var(--accent)", color: "var(--ink)", padding: "0 6px", borderRadius: 6 }}>for free</span>. No documents needed.</>} />
        </h2>
        <p style={{ color: "rgba(250,250,247,0.6)", fontSize: 14, maxWidth: 360, lineHeight: 1.5, marginBottom: 32 }}>
          <T fr="Testez l'API et le checkout en mode sandbox imm\u00e9diatement. KYC seulement pour passer en production."
             en="Test the API and checkout in sandbox right away. KYC only required to go live." />
        </p>

        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 20, backdropFilter: "blur(8px)" }}>
          <div style={{ fontFamily: "var(--display)", fontSize: 16, lineHeight: 1.45 }}>
            <T fr={"\u00ab On a couvert 8 pays en 2 semaines. Avant Nkap, il fallait 6 mois par pays. \u00bb"}
               en={"\u201cWe covered 8 countries in 2 weeks. Before Nkap, each country took 6 months.\u201d"} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, fontSize: 12, color: "rgba(250,250,247,0.6)" }}>
            <span>S\u00e9bastien K. — CTO, KILIMO SARL</span>
          </div>
        </div>
      </aside>

      <section style={{ display: "flex", alignItems: "center", justifyContent: "center", overflowY: "auto" }}>
        <div className="auth-form-wrap">
          <h1 style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 36, letterSpacing: "-0.025em", lineHeight: 1.05, margin: "0 0 8px" }}>
            <T fr="Cr\u00e9er votre compte" en="Create your account" />
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 28px", lineHeight: 1.45 }}>
            <T fr="Quelques infos rapides pour configurer votre compte marchand." en="A few quick details to set up your merchant account." />
          </p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input
              id="name"
              label={lang === "en" ? "Business name" : "Nom de l'entreprise"}
              placeholder="Boutique Mami SARL"
              error={errors.name?.message}
              {...register("name")}
            />
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
              placeholder={lang === "en" ? "Min. 8 characters" : "Min. 8 caract\u00e8res"}
              error={errors.password?.message}
              {...register("password")}
            />
            <Input
              id="phone"
              label={lang === "en" ? "Phone (optional)" : "T\u00e9l\u00e9phone (optionnel)"}
              placeholder="+237 670 12 34 56"
              {...register("phone")}
            />
            <Input
              id="website"
              label={lang === "en" ? "Website (optional)" : "Site web (optionnel)"}
              placeholder="https://..."
              {...register("website")}
            />

            <Button type="submit" variant="primary" size="lg" isLoading={isLoading} style={{ marginTop: 8, justifyContent: "center", width: "100%" }}>
              <T fr="Cr\u00e9er le compte" en="Create account" /> <Icon name="arrow" size={14} color="white" />
            </Button>
          </form>

          <div style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 20 }}>
            <T fr="D\u00e9j\u00e0 un compte ? " en="Already have an account? " />
            <Link href="/merchant/login" style={{ color: "var(--primary)", fontWeight: 500, textDecoration: "none" }}>
              <T fr="Se connecter" en="Sign in" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function MerchantRegisterPage() {
  return (
    <LangProvider>
      <MerchantRegisterContent />
    </LangProvider>
  );
}
