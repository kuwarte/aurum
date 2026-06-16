"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard") || pathname.startsWith("/settings");

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
