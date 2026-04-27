"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Button, Input, Card, CardContent, CardHeader } from "@/components/ui";
import { merchantAuthService } from "@/services/merchant-auth.service";
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

export default function MerchantRegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const router = useRouter();

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
      <div className="rounded-xl bg-white p-8 shadow-xl">
        <h2 className="mb-2 text-center text-xl font-semibold text-gray-900">
          Registration Successful
        </h2>
        <p className="mb-6 text-center text-sm text-red-600 font-medium">
          Save these credentials now. The API secret cannot be retrieved again.
        </p>

        <div className="space-y-3">
          {[
            { label: "Live API Key", value: credentials.api_key_live, field: "live" },
            { label: "Test API Key", value: credentials.api_key_test, field: "test" },
            { label: "API Secret", value: credentials.api_secret, field: "secret" },
            { label: "Webhook Secret", value: credentials.webhook_secret, field: "webhook" },
          ].map((item) => (
            <div key={item.field} className="rounded-lg border p-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {item.label}
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs break-all text-gray-800 bg-gray-50 px-2 py-1 rounded">
                  {item.value}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(item.value, item.field)}
                  className="shrink-0 p-1 text-gray-400 hover:text-gray-600"
                >
                  {copiedField === item.field ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <Button
          className="w-full mt-6"
          onClick={() => router.push("/merchant/dashboard")}
        >
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-xl">
      <h2 className="mb-6 text-center text-xl font-semibold text-gray-900">
        Create Merchant Account
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="name"
          label="Business Name"
          placeholder="Your business name"
          error={errors.name?.message}
          {...register("name")}
        />

        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="you@business.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="Min. 8 characters"
          error={errors.password?.message}
          {...register("password")}
        />

        <Input
          id="phone"
          label="Phone (optional)"
          placeholder="+237..."
          {...register("phone")}
        />

        <Input
          id="website"
          label="Website (optional)"
          placeholder="https://..."
          {...register("website")}
        />

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Create Account
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/merchant/login" className="font-medium text-gold-500 hover:text-gold-600">
          Sign in
        </Link>
      </p>
    </div>
  );
}
