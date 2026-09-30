import Link from "next/link";
import type { Metadata } from "next";

/**
 * Página de privacidad.
 *
 * Sólo afirma cosas verificables desde el propio código: qué campos se piden,
 * dónde quedan, quién los ve y qué NO hace el sitio. Los plazos de conservación
 * y el circuito de borrado son decisiones del estudio y no están acá: escribir
 * «se conservan 24 meses» sin que nadie lo haya definido sería inventar una
 * política. Ver `docs/privacidad-pendiente.md` (I-CONT-02).
 */
export const metadata: Metadata = {
  title: "Privacidad y protección de datos",
  description:
    "Qué datos recoge el sitio de IMPACTO Estudio Jurídico, para qué se usan, dónde quedan y cómo pedir su acceso, corrección o eliminación.",
};

export default function Privacidad() {
  return (
    <main className="container section pagina-legal">
      <Link href="/">← Volver al inicio</Link>

      <h1 className="display section-title">
        Privacidad y protección de datos
      </h1>

      <p className="lead">
        Esta página describe qué datos recoge este sitio web, con qué finalidad
        y dónde quedan guardados. Sólo describe el funcionamiento del sitio: la
        relación profesional con el estudio se rige por sus propios acuerdos.
      </p>

      <h2>Qué datos se recogen</h2>

      <h3>Solicitud de turno</h3>
      <p className="lead">
        La agenda de Cal.com solicita <strong>nombre y apellido</strong>,{" "}
        <strong>correo</strong>, <strong>teléfono de contacto</strong> y una
        categoría breve de consulta, junto con el día y el horario elegidos.
        Se usan únicamente para gestionar la consulta, enviar avisos y
        comunicarnos con vos.
      </p>
      <p className="lead">
        Te pedimos que{" "}
        <strong>
          no incluyas documentación, información médica, números de documento
          ni datos de terceros
        </strong>{" "}
        en ese campo: para eso está la consulta, no el formulario.
      </p>

      <h3>Opiniones</h3>
      <p className="lead">
        Si compartís una experiencia, se guardan el{" "}
        <strong>nombre o las iniciales</strong> que indiques, la{" "}
        <strong>calificación</strong> y el <strong>texto</strong>. Al enviarla
        marcás una casilla que autoriza su publicación, y ese consentimiento
        queda registrado con la opinión.
      </p>

      <h2>Cómo se moderan las opiniones</h2>
      <p className="lead">
        Ninguna opinión se publica automáticamente. Todas quedan pendientes de
        revisión y se publican{" "}
        <strong>con la calificación que puso quien la escribió</strong>, sea
        alta o baja. Se rechazan las que exponen datos del caso, información de
        terceros o contenido que no corresponde a una experiencia real con el
        estudio; no se rechazan por ser críticas.
      </p>
      <p className="lead">
        Podés pedir que retiremos tu opinión en cualquier momento escribiendo a
        la dirección de contacto.
      </p>

      <h2>Qué hace y qué no hace este sitio</h2>
      <ul className="lista-legal">
        <li>
          <strong>No hay analítica ni publicidad.</strong> El sitio no usa
          Google Analytics ni ningún otro sistema de medición, y no tiene
          píxeles ni etiquetas publicitarias.
        </li>
        <li>
          <strong>La agenda es provista por Cal.com.</strong> Al abrirla, ese
          servicio puede tratar datos técnicos y utilizar almacenamiento o
          cookies necesarios para prestar la reserva. Consultá también la
          política de privacidad de Cal.com antes de enviar tus datos.
        </li>
        <li>
          <strong>No vendemos datos ni los compartimos con fines publicitarios.</strong>{" "}
          Cal.com y el calendario conectado reciben los datos necesarios para
          administrar la reserva y enviar sus comunicaciones.
        </li>
        <li>
          <strong>El acceso al panel está restringido</strong> a las cuentas
          expresamente autorizadas.
        </li>
      </ul>

      <h2>Opiniones de Google</h2>
      <p className="lead">
        La página puede mostrar reseñas públicas obtenidas mediante Google
        Places. Se presentan con la atribución, fecha relativa y enlace a la
        fuente que entrega Google. El sitio no guarda copias permanentes de ese
        contenido y Google puede tratar datos técnicos al abrir sus enlaces.
      </p>

      <h2>Conservación de los datos</h2>
      <p className="lead">
        Las solicitudes de turno y las opiniones se conservan mientras sean
        necesarias para la finalidad por la que se enviaron. El plazo concreto
        de conservación y el circuito de eliminación están siendo definidos por
        el estudio; hasta que se publiquen acá, podés pedir la eliminación de
        tus datos en cualquier momento por el canal de contacto y se atenderá el
        pedido.
      </p>

      <h2>Tus derechos</h2>
      <p className="lead">
        Podés solicitar el acceso, la corrección o la eliminación de tus datos
        escribiendo a{" "}
        <a href="mailto:estudiojuridicofernandezrr@gmail.com">
          estudiojuridicofernandezrr@gmail.com
        </a>
        . Indicá desde qué dirección o con qué nombre enviaste la consulta para
        poder localizarla.
      </p>

      <h2>Cambios</h2>
      <p className="lead">
        Si cambia la forma en que el sitio trata los datos, esta página se
        actualiza. Los cambios relevantes se reflejan acá antes de aplicarse.
      </p>
    </main>
  );
}
