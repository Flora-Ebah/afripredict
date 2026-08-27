import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { AuthModal } from "../components/AuthModal";
import { SearchModal } from "../components/SearchModal";
import { HomeHero } from "../components/HomeHero";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AfriPredict — Trade Your Beliefs. Shape Africa.",
  description:
    "Pariez sur l'avenir. Investissez dans ce qui compte. Plateforme africaine de marchés prédictifs — POC en simulation, crédits virtuels AFR uniquement.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Applique le thème avant le premier rendu pour éviter le flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var m=localStorage.getItem("afripredict-theme")||"system";var d=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}`,
          }}
        />
      </head>
      <body className={jakarta.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <HomeHero />
            <Header />
            <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">{children}</main>
            <Footer />
          </div>
          <AuthModal />
          <SearchModal />
        </Providers>
      </body>
    </html>
  );
}
