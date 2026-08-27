import {
  chatGPTSignOutPath,
  getChatGPTUser,
  chatGPTSignInPath,
} from "../chatgpt-auth";
import { autorizar } from "../../lib/autorizacion";
import { getD1, hayBase } from "../../db";
import { AdminPanel } from "./AdminPanel";
import { redirect } from "next/navigation";

/**
 * Panel de administración.
 *
 * La autorización se resuelve **en el servidor, antes de renderizar**: si la
 * cuenta no está autorizada, el HTML del panel no se genera y por lo tanto no
 * llega al navegador. No hay nada que revelar inspeccionando la respuesta.
 *
 * Los cuatro desenlaces posibles se distinguen a propósito, porque cada uno
 * pide una acción distinta de quien lo ve.
 */
export const dynamic = "force-dynamic";

function Mensaje({
  titulo,
  cuerpo,
  accion,
}: {
  titulo: string;
  cuerpo: string;
  accion?: React.ReactNode;
}) {
  return (
    <main className="container section">
      <h1 className="display section-title">{titulo}</h1>
      <p className="lead">{cuerpo}</p>
      {accion}
    </main>
  );
}

export default async function AdminPage() {
  const usuario = await getChatGPTUser();
  const resultado = autorizar(usuario);

  if (resultado.estado === "sin_configurar") {
    // Falla cerrada. Antes, si faltaba ADMIN_EMAILS, el código caía en una
    // dirección fija escrita a mano y el panel quedaba abierto (I-SEC-02).
    return (
      <Mensaje
        titulo="Administración no configurada"
        cuerpo={
          "Este entorno no tiene definida la variable ADMIN_EMAILS, así que no hay ninguna cuenta " +
          "autorizada para administrar el sitio. Configurala antes de usar el panel."
        }
      />
    );
  }

  if (resultado.estado === "sin_sesion") {
    redirect(chatGPTSignInPath("/admin"));
  }

  if (resultado.estado === "prohibido") {
    return (
      <Mensaje
        titulo="Acceso restringido"
        cuerpo="Esta cuenta no está autorizada para administrar el sitio."
        accion={<a href={chatGPTSignOutPath("/")}>Cerrar sesión</a>}
      />
    );
  }

  if (!hayBase()) {
    return (
      <Mensaje
        titulo="Base de datos no disponible"
        cuerpo="No se pudo conectar con la base. Revisá el binding D1 del entorno."
      />
    );
  }

  const db = getD1();

  const [turnos, opiniones, horarios] = await Promise.all([
    db
      .prepare(
        `SELECT id, name, age, situation, date, time, status, internal_notes, created_at
         FROM appointments ORDER BY date ASC, time ASC`,
      )
      .all(),
    db
      .prepare(
        `SELECT id, display_name, rating, content, status, moderation_notes, consent_at, created_at
         FROM reviews ORDER BY created_at DESC`,
      )
      .all(),
    db
      .prepare(
        `SELECT a.id, a.date, a.time, a.enabled, a.note,
                (SELECT COUNT(*) FROM appointments t
                 WHERE t.date = a.date AND t.time = a.time
                   AND t.status IN ('pending','confirmed','rescheduled')) AS ocupado
         FROM availability a ORDER BY a.date, a.time`,
      )
      .all(),
  ]);

  return (
    <AdminPanel
      usuario={resultado.email}
      turnosIniciales={turnos.results ?? []}
      opinionesIniciales={opiniones.results ?? []}
      horariosIniciales={horarios.results ?? []}
    />
  );
}
