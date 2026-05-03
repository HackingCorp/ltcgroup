"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Button, Input } from "@/components/ui";
import { merchantAuthService } from "@/services/merchant-auth.service";

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

export default function MerchantResetPasswordPage() {
  return (
    <Suspense fallback={<div className="rounded-xl bg-white p-8 shadow-xl text-center text-gray-500">Chargement...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

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
      toast.success("Mot de passe réinitialisé avec succès");
      router.push("/merchant/login");
    } catch {
      toast.error("Token invalide ou expiré");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-xl text-center">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Lien invalide
        </h2>
        <p className="mb-6 text-sm text-gray-600">
          Le lien de réinitialisation est invalide ou a expiré.
        </p>
        <Link
          href="/merchant/forgot-password"
          className="font-medium text-gold-500 hover:text-gold-600"
        >
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-xl">
      <h2 className="mb-2 text-center text-xl font-semibold text-gray-900">
        Nouveau mot de passe
      </h2>
      <p className="mb-6 text-center text-sm text-gray-600">
        Choisissez un nouveau mot de passe pour votre compte.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="password"
          label="Nouveau mot de passe"
          type="password"
          placeholder="Minimum 8 caractères"
          error={errors.password?.message}
          {...register("password")}
        />

        <Input
          id="confirmPassword"
          label="Confirmer le mot de passe"
          type="password"
          placeholder="Répétez le mot de passe"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Réinitialiser le mot de passe
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        <Link
          href="/merchant/login"
          className="font-medium text-gold-500 hover:text-gold-600"
        >
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
