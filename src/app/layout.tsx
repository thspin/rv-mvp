import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "RV - Ecosistema de Gestion y Control de Riesgos Deportivos",
  description: "La plataforma de software integral para clubes y organizadores de resistencia. Controla membresías, automatiza cobros y mitiga riesgos legales mediante la validacion inteligente de aptos medicos.",
  keywords: ["gestion deportiva", "clubes de corredores", "trail running", "apto medico", "acreditacion offline", "carreras de montana"],
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full scroll-smooth">
      <body className={`${inter.variable} min-h-full flex flex-col font-sans bg-background text-foreground antialiased pb-24`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
