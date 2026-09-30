import Link from "next/link";
import { whatsapp } from "../../lib/contacto";
import { CAL_URL, PROVEEDOR_TURNOS } from "../../lib/turnero-config";
import { Marca } from "./Marca";
import { CalCalendar } from "./CalCalendar";

export function Turnero() {
  const listo = PROVEEDOR_TURNOS === "cal" && Boolean(CAL_URL);
  return (
    <section className="section booking" id="turnos" aria-labelledby="h-turnos">
      <div className="container booking-shell">
        <div className="booking-info">
          <span className="eyebrow">Consulta profesional</span>
          <h2 id="h-turnos" className="display">El primer paso puede ser simple.</h2>
          <p>Elegí un horario y completá tus datos de contacto. La solicitud queda pendiente hasta que el estudio la revise y la confirme por correo.</p>
          <p className="privacy-note">Usamos tus datos para gestionar la consulta a través de Cal.com. No incluyas documentación ni información sensible. <Link href="/privacidad">Conocé cómo tratamos tus datos.</Link></p>
        </div>
        <div className="booking-action">
          <div className="booking-action-inner">
            <div className="booking-logo" aria-label="IMPACTO Estudio Jurídico"><Marca /></div>
            {listo ? <><h3 className="display">Elegí cuándo conversar</h3><p>La agenda muestra horarios reales en tu zona y evita superposiciones con el calendario profesional.</p><CalCalendar calLink={CAL_URL.replace("https://cal.com/", "")} /><a className="booking-link" href={CAL_URL} target="_blank" rel="noreferrer noopener">Abrir agenda en otra pestaña</a></> : <><h3 className="display">Agenda en configuración</h3><p>Estamos terminando de conectar el calendario. Mientras tanto, coordiná tu consulta directamente con el estudio.</p></>}
            <a className="btn btn-whatsapp" href={whatsapp("Hola, quiero coordinar una consulta con IMPACTO Estudio Jurídico.")} target="_blank" rel="noreferrer noopener" aria-label="Contactar por WhatsApp"><img src="/whatsapp.svg" alt="" />Coordinar por WhatsApp</a>
          </div>
        </div>
      </div>
    </section>
  );
}
