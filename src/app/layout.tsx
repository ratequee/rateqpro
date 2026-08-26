import type { ReactNode } from "react";
import { Almarai, Inter } from "next/font/google";
import { getLocale } from "next-intl/server";
import { ThemeProvider } from "@/components/layout/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "600", "700"],
});

const almarai = Almarai({
  subsets: ["arabic"],
  variable: "--font-almarai",
  weight: ["300", "400", "700"],
});

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${inter.variable} ${almarai.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
