"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/vcard-api";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/services/solutions-financieres/vcard/auth");
    } else {
      setIsChecking(false);
    }
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#10151e]">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-[#cea427] animate-spin">
            progress_activity
          </span>
          <p className="text-white mt-4 font-medium">Vérification...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
