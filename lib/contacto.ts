/**
 * Datos de contacto compartidos.
 *
 * Vive en `lib/` y no en un componente porque lo usan tanto el servidor (las
 * secciones estáticas) como el cliente. Exportarlo desde un módulo marcado
 * `"use client"` hacía que llamarlo durante el render del servidor fallara con
 * «Unexpectedly client reference export is called on server».
 */
const TELEFONO_WHATSAPP = "542634210691";

export const whatsapp = (texto: string): string =>
  `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(texto)}`;
