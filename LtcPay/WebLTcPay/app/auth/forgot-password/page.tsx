"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Button, Input } from "@/components/ui";
import { authService } from "@/services/auth.service";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordForm = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
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
      await authService.forgotPassword(data.email);
      setSent(true);
      toast.success("Reset link sent to your email");
    } catch {
      toast.error("Failed to send reset link");
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-xl text-center">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Check your email</h2>
        <p className="mb-6 text-sm text-gray-600">
          We sent a password reset link to your email address.
        </p>
        <Link href="/auth/login" className="font-medium text-gold-500 hover:text-gold-600">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-xl">
      <h2 className="mb-2 text-center text-xl font-semibold text-gray-900">
        Forgot your password?
      </h2>
      <p className="mb-6 text-center text-sm text-gray-600">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        <Link href="/auth/login" className="font-medium text-gold-500 hover:text-gold-600">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
