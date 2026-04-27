"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, Button, Input } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { merchantAuthService } from "@/services/merchant-auth.service";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  phone: z.string().optional(),
  website: z.string().optional(),
  callback_url: z.string().optional(),
  business_type: z.string().optional(),
  description: z.string().optional(),
});

const passwordSchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: z.string().min(8, "New password must be at least 8 characters"),
  confirm_password: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function MerchantProfilePage() {
  const { merchantUser, loadUser } = useAuth();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: merchantUser?.name || "",
      phone: merchantUser?.phone || "",
      website: merchantUser?.website || "",
      callback_url: merchantUser?.callback_url || "",
      business_type: merchantUser?.business_type || "",
      description: merchantUser?.description || "",
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileForm) => {
    setSavingProfile(true);
    try {
      await merchantAuthService.updateProfile(data);
      await loadUser();
      toast.success("Profile updated!");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Update failed"
          : "Update failed";
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    setSavingPassword(true);
    try {
      await merchantAuthService.changePassword(data.current_password, data.new_password);
      passwordForm.reset();
      toast.success("Password changed!");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Password change failed"
          : "Password change failed";
      toast.error(message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4 max-w-lg">
            <Input
              id="name"
              label="Business Name"
              error={profileForm.formState.errors.name?.message}
              {...profileForm.register("name")}
            />
            <Input
              id="phone"
              label="Phone"
              placeholder="+237..."
              {...profileForm.register("phone")}
            />
            <Input
              id="website"
              label="Website"
              placeholder="https://..."
              {...profileForm.register("website")}
            />
            <Input
              id="callback_url"
              label="Callback URL (Webhook)"
              placeholder="https://yoursite.com/webhook"
              {...profileForm.register("callback_url")}
            />
            <Input
              id="business_type"
              label="Business Type"
              placeholder="e.g. E-commerce, SaaS"
              {...profileForm.register("business_type")}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-200"
                rows={3}
                {...profileForm.register("description")}
              />
            </div>
            <Button type="submit" isLoading={savingProfile}>
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-lg">
            <Input
              id="current_password"
              label="Current Password"
              type="password"
              error={passwordForm.formState.errors.current_password?.message}
              {...passwordForm.register("current_password")}
            />
            <Input
              id="new_password"
              label="New Password"
              type="password"
              error={passwordForm.formState.errors.new_password?.message}
              {...passwordForm.register("new_password")}
            />
            <Input
              id="confirm_password"
              label="Confirm New Password"
              type="password"
              error={passwordForm.formState.errors.confirm_password?.message}
              {...passwordForm.register("confirm_password")}
            />
            <Button type="submit" isLoading={savingPassword}>
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
