"use client";

import { MerchantLayout } from "@/components/layout/merchant-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <MerchantLayout>{children}</MerchantLayout>;
}
