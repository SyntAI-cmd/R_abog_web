import { NextResponse } from "next/server";
import { getChatGPTUser } from "../app/chatgpt-auth";
import { autorizar, respuestaDeAutorizacion } from "./autorizacion";
import { hayBase } from "../db";

/**
 * Guardia común de las rutas de administración.
 *
 * Estaba repetida —y con un valor por defecto peligroso— en cada endpoint. Al
 * unificarla, endurecerla es un solo cambio en un solo lugar, y agregar una ruta
 * nueva no puede olvidarse el control.
 *
 * Devuelve `null` cuando la petición puede continuar, o la respuesta de error
 * ya armada cuando no.
 */
export async function exigirAdmin(): Promise<Response | null> {
  const resultado = autorizar(await getChatGPTUser());

  if (resultado.estado !== "autorizado") {
    const { status, error } = respuestaDeAutorizacion(resultado);
    // El log registra el motivo, nunca la dirección de correo: es un dato
    // personal y no hace falta para diagnosticar.
    console.warn(`[admin] acceso rechazado: ${resultado.estado}`);
    return NextResponse.json({ error }, { status });
  }

  if (!hayBase()) {
    return NextResponse.json(
      { error: "La base de datos no está disponible en este entorno." },
      { status: 503 },
    );
  }

  return null;
}
