"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Button, Input } from "@/components/ui";
import { merchantAuthService } from "@/services/merchant-auth.service";

const schema = z.object({
  email: z.string().email("Adresse email invalide"),
});

type ForgotPasswordForm = z.infer<typeof schema>;

export default function MerchantForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

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
      await merchantAuthService.forgotPassword(data.email);
      setSent(true);
      toast.success("Demande envoyée");
    } catch {
      toast.error("Échec de l\u2019envoi");
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-xl text-center">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Vérifiez vos emails
        </h2>
        <p className="mb-6 text-sm text-gray-600">
          Si un compte existe avec cette adresse, un lien de réinitialisation a été envoyé.
        </p>
        <Link
          href="/merchant/login"
          className="font-medium text-gold-500 hover:text-gold-600"
        >
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-xl">
      <h2 className="mb-2 text-center text-xl font-semibold text-gray-900">
        Mot de passe oublié ?
      </h2>
      <p className="mb-6 text-center text-sm text-gray-600">
        Entrez votre email et nous vous enverrons un lien de réinitialisation.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="vous@exemple.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Envoyer le lien
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
