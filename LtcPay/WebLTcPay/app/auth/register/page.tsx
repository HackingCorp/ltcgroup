"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";

const registerSchema = z
  .object({
    full_name: z.string().min(2, "Full name is required"),
    email: z.string().email("Invalid email address"),
    business_name: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { register: registerUser } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      await registerUser({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        business_name: data.business_name,
      });
      toast.success("Account created! Please sign in.");
      router.push("/auth/login");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl bg-white p-8 shadow-xl">
      <h2 className="mb-6 text-center text-xl font-semibold text-gray-900">
        Create your account
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="full_name"
          label="Full Name"
          placeholder="John Doe"
          error={errors.full_name?.message}
          {...register("full_name")}
        />

        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          id="business_name"
          label="Business Name (optional)"
          placeholder="My Business"
          error={errors.business_name?.message}
          {...register("business_name")}
        />

        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register("password")}
        />

        <Input
          id="confirm_password"
          label="Confirm Password"
          type="password"
          placeholder="Confirm your password"
          error={errors.confirm_password?.message}
          {...register("confirm_password")}
        />

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-medium text-gold-500 hover:text-gold-600">
          Sign in
        </Link>
      </p>
    </div>
  );
}
