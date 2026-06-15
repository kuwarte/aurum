import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { ThemeToggle } from "@/components/theme-toggle";

const headingFont = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aurum | Agentic Crypto Credit",
  description:
    "Aurum is a modern credit intelligence experience for crypto lending, explainable scoring, and RWA visibility.",
};

const themeScript = `
(() => {
  const stored = window.localStorage.getItem("aurum-theme");
  const theme = stored === "dark" || stored === "light" ? stored : "light";
  document.documentElement.dataset.theme = theme;
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${headingFont.variable} ${bodyFont.variable}`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <div className="site-bg" />
        <div className="shell">
          <Navbar />

          {children}
        </div>
        <ThemeToggle />
      </body>
    </html>
  );
}
