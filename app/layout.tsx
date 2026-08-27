import type { Metadata } from "next";
import { headers } from "next/headers";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600"] });
const sans = Manrope({ variable: "--font-sans", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers(); const host = h.get("host") || "localhost:3000"; const protocol = host.includes("localhost") ? "http" : "https";
  return { metadataBase: new URL(`${protocol}://${host}`),
  title: { default: "IMPACTO Estudio Jurídico | Mendoza", template: "%s | IMPACTO" },
  description: "Estudio jurídico en Mendoza especializado en accidentes de tránsito, accidentes laborales (ART) y derecho laboral. Asesoramiento claro, humano y profesional.",
  keywords: ["estudio jurídico Mendoza", "abogados accidentes de tránsito Mendoza", "abogados ART Mendoza", "derecho laboral Mendoza"],
  openGraph: { title: "Después del impacto, defendemos tus derechos.", description: "Acompañamiento jurídico claro y estratégico en Mendoza.", locale: "es_AR", type: "website", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "IMPACTO Estudio Jurídico", description: "Después del impacto, defendemos tus derechos.", images: ["/og.png"] },
  icons: { icon: "/favicon.svg" },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-AR"><body className={`${display.variable} ${sans.variable}`}>{children}</body></html>;
}
