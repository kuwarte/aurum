"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/score-breakdown") ||
    pathname.startsWith("/agents") ||
    pathname.startsWith("/loan-offers") ||
    pathname.startsWith("/portfolio") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/compliance") ||
    pathname.startsWith("/oracle-demo");

  if (isDashboard) {
    return <>{children}</>;
  }

  return (
    <div className="shell">
      <Navbar />
      {children}
    </div>
  );
}
