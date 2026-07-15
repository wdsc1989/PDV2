import type { Metadata, Viewport } from "next";
import { Rubik, Nunito_Sans, Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";
import { RegistraSW } from "@/components/Pwa";

const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-rubik",
  weight: ["300", "400", "500", "600", "700"],
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["300", "400", "500", "600", "700"],
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PDV2 - Loja de Roupas",
  description: "Sistema de Ponto de Venda",
  manifest: "/manifest.json",
  // atalho do iOS abre em tela cheia (sem barra do Safari) + icone
  appleWebApp: { capable: true, statusBarStyle: "default", title: "PDV2" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  // o Next moderno so emite `mobile-web-app-capable`; o iOS antigo depende do legado
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#A16207",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${rubik.variable} ${nunitoSans.variable} ${cormorant.variable} ${montserrat.variable} font-sans antialiased`}>
        <RegistraSW />
        {children}
      </body>
    </html>
  );
}
