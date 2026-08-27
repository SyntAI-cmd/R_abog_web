import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { esProduccion, origen, schemaDelEstudio } from "../lib/sitio";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const sans = Manrope({ variable: "--font-sans", subsets: ["latin"] });

/**
 * Metadatos del sitio.
 *
 * El origen ya no se deduce de la cabecera `Host` de cada petición: eso hacía
 * que el canonical dependiera de por dónde entró el visitante, y bastaba una
 * cabecera manipulada para emitir un canonical hacia otro dominio. Ahora sale de
 * `SITE_URL`, que es una decisión del despliegue (I-SEO-01).
 */
export const metadata: Metadata = {
  metadataBase: new URL(origen()),
  title: {
    default: "IMPACTO Estudio Jurídico | Mendoza",
    template: "%s | IMPACTO Estudio Jurídico",
  },
  description:
    "Estudio jurídico en Mendoza especializado en accidentes de tránsito, accidentes laborales (ART) y derecho laboral. Asesoramiento claro, humano y profesional.",
  keywords: [
    "estudio jurídico Mendoza",
    "abogados accidentes de tránsito Mendoza",
    "abogados ART Mendoza",
    "derecho laboral Mendoza",
  ],
  alternates: { canonical: "/" },
  // Una preview no se indexa. Depende del origen del build, no de que alguien
  // se acuerde de cambiar una bandera.
  robots: esProduccion()
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },
  openGraph: {
    title: "Después del impacto, defendemos tus derechos.",
    description: "Acompañamiento jurídico claro y estratégico en Mendoza.",
    locale: "es_AR",
    type: "website",
    url: origen(),
    siteName: "IMPACTO Estudio Jurídico",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "IMPACTO Estudio Jurídico, Mendoza",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IMPACTO Estudio Jurídico",
    description: "Después del impacto, defendemos tus derechos.",
    images: ["/og.jpg"],
  },
  // Se declaran los dos: el SVG para navegadores modernos y el .ico para los
  // que lo piden igual. Sin el .ico, cada carga dejaba un 404 en la consola
  // (I-P3-01), porque el navegador lo busca por convención aunque no se declare.
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body className={`${display.variable} ${sans.variable}`}>
        {children}
        <script
          type="application/ld+json"
          // El contenido es un objeto propio serializado, no entrada de usuario.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schemaDelEstudio()),
          }}
        />
      </body>
    </html>
  );
}
