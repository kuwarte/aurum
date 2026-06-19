"use client";

/**
 * AurumWagmiProvider
 *
 * wagmi has been removed. This component now just provides React Query
 * (still used by other parts of the app) and the CasperWalletProvider.
 */

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CasperWalletProvider } from "@/lib/casper-wallet";

export function AurumWagmiProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <CasperWalletProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </CasperWalletProvider>
  );
}
