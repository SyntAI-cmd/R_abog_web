/**
 * Secciones estáticas del sitio.
 *
 * Ninguna lleva estado ni interacción, así que se renderizan en el servidor y
 * no viajan al navegador como JavaScript. Las tres partes que sí necesitan
 * interacción —navegación, opiniones y turnero— viven en sus propios archivos
 * marcados `"use client"`, y las preguntas frecuentes en `Preguntas.tsx`.
 *
 * El contenido es el mismo que ya estaba aprobado; lo que cambió es la
 * estructura. `ImpactoSite.tsx` era un único archivo con líneas de más de 3.000
 * caracteres donde cada sección, el turnero, las reseñas, el modal y el pie
 * convivían mezclados (I-TECH-03). Cualquier cambio obligaba a leerlo entero y
 * ninguna parte se podía probar por separado.
 */
import { whatsapp } from "../../lib/contacto";

const AREAS = [
  [
    "01",
    "Accidentes de tránsito",
    "Reclamos por daños personales y materiales. Analizamos lo ocurrido, reunimos la documentación y defendemos un resarcimiento justo.",
  ],
  [
    "02",
    "Accidentes laborales · ART",
    "Acompañamiento frente a accidentes o enfermedades laborales, desde la denuncia hasta las instancias médicas y legales.",
  ],
  [
    "03",
    "Derecho laboral",
    "Asesoramiento claro ante despidos, diferencias salariales, registración deficiente y otros conflictos del trabajo.",
  ],
] as const;

const PASOS = [
  "Escuchamos tu caso",
  "Evaluamos tu situación",
  "Te asesoramos con claridad",
  "Diseñamos la estrategia",
  "Acompañamos el proceso",
  "Defendemos tus derechos",
] as const;

const VALORES = [
  [
    "Atención personalizada",
    "Cada historia y cada caso merecen una mirada propia.",
  ],
  ["Comunicación clara", "Te explicamos opciones, riesgos y próximos pasos."],
  ["Estrategia legal", "Tomamos decisiones con criterio y fundamento."],
  ["Transparencia", "Información directa durante todo el proceso."],
  ["Acompañamiento", "No atravesás solo una situación compleja."],
  ["Compromiso real", "Trabajamos para proteger tus derechos."],
] as const;

export function Hero() {
  return (
    <section className="hero" id="inicio">
      <div className="container hero-content">
        <div className="hero-grid">
          <div>
            <span className="eyebrow">Mendoza · Argentina</span>
            <h1 className="display">
              Después del <em>impacto,</em>
              <br />
              defendemos tus derechos.
            </h1>
          </div>
          <div className="hero-side">
            <p>
              Te acompañamos con claridad y estrategia ante accidentes de
              tránsito, reclamos laborales y ART.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#turnos">
                Solicitar consulta
              </a>
              <a
                className="btn btn-outline"
                target="_blank"
                rel="noreferrer noopener"
                href={whatsapp(
                  "Hola, quiero realizar una consulta con IMPACTO Estudio Jurídico.",
                )}
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="hero-proof">
        <div className="container proof-in">
          <span>Asesoramiento personalizado</span>
          <span>Comunicación clara</span>
          <span>Defensa profesional</span>
          <span>Resarcimiento justo</span>
        </div>
      </div>
    </section>
  );
}

export function Estudio() {
  return (
    <section className="section" id="estudio" aria-labelledby="h-estudio">
      <div className="container intro-grid">
        <div>
          <span className="eyebrow">Nuestra forma de ejercer</span>
          <div className="number" aria-hidden="true">
            01
          </div>
        </div>
        <div>
          <h2 id="h-estudio" className="display statement">
            No sos un expediente.
            <br />
            <span>Sos una persona que necesita respuestas.</span>
          </h2>
          <div className="intro-copy">
            <p className="lead">
              En IMPACTO acompañamos a personas que atraviesan las consecuencias
              de un accidente o un conflicto laboral. Escuchamos, explicamos y
              construimos una estrategia adecuada para cada situación.
            </p>
            <p className="lead">
              Trabajamos con una mirada profesional y humana: para que
              comprendas tus derechos, sepas qué esperar y cuentes con respaldo
              durante todo el proceso.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Areas() {
  return (
    <section className="section practices" id="areas" aria-labelledby="h-areas">
      <div className="container">
        <span className="eyebrow">Áreas de práctica</span>
        <h2 id="h-areas" className="display section-title">
          Experiencia enfocada donde más la necesitás.
        </h2>
        <ul className="cards">
          {AREAS.map(([numero, titulo, detalle]) => (
            <li className="card" key={numero}>
              <span className="card-num" aria-hidden="true">
                {numero}
              </span>
              <h3 className="display">{titulo}</h3>
              <p>{detalle}</p>
            </li>
          ))}
        </ul>
        <p className="areas-nota">
          Si tu consulta es de otra materia, escribinos igual: te decimos si
          podemos ayudarte o te orientamos sobre a quién acudir.
        </p>
      </div>
    </section>
  );
}

export function Metodo() {
  return (
    <section className="section process" id="metodo" aria-labelledby="h-metodo">
      <div className="container">
        <div className="process-head">
          <div>
            <span className="eyebrow">Un proceso claro</span>
            <h2 id="h-metodo" className="display section-title">
              Del impacto
              <br />
              al resarcimiento.
            </h2>
          </div>
          <p className="lead">
            Cada etapa tiene un propósito. Te mantenemos al tanto, sin
            tecnicismos innecesarios y con una estrategia que responde a tu
            caso.
          </p>
        </div>
        <ol className="steps">
          {PASOS.map((paso, indice) => (
            <li className="step" key={paso}>
              <b aria-hidden="true">0{indice + 1}</b>
              <span>{paso}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Diferencia() {
  return (
    <section className="section" aria-labelledby="h-diferencia">
      <div className="container difference-grid">
        <div className="quote-panel">
          <span className="eyebrow">Nuestro compromiso</span>
          <blockquote>
            La confianza se construye con presencia, claridad y resultados.
          </blockquote>
          <span>IMPACTO · Estudio Jurídico</span>
        </div>
        <div>
          <span className="eyebrow">Por qué elegirnos</span>
          <h2 id="h-diferencia" className="display section-title">
            Una defensa firme.
            <br />
            Un trato cercano.
          </h2>
          <ul className="values">
            {VALORES.map(([titulo, detalle]) => (
              <li className="value" key={titulo}>
                <b>{titulo}</b>
                <p>{detalle}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function LlamadoFinal() {
  return (
    <section className="section cta" aria-labelledby="h-cta">
      <div className="container">
        <span className="eyebrow">Estamos para escucharte</span>
        <h2 id="h-cta" className="display">
          Tu situación merece claridad y defensa.
        </h2>
        <div className="cta-actions">
          <a className="btn btn-dark" href="#turnos">
            Solicitar consulta
          </a>
          <a
            className="btn"
            style={{ borderColor: "var(--petrol)" }}
            target="_blank"
            rel="noreferrer noopener"
            href={whatsapp(
              "Hola, quiero solicitar un turno con IMPACTO Estudio Jurídico.",
            )}
          >
            Hablar por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

export function PieDePagina() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <a className="brand" href="#inicio">
              <span className="brand-mark" aria-hidden="true">
                <span>I</span>
              </span>
              <span>
                <span className="brand-name">IMPACTO</span>
                <span className="brand-sub">ESTUDIO JURÍDICO</span>
              </span>
            </a>
            <p style={{ marginTop: 25, maxWidth: 350 }}>
              Acompañamiento legal profesional, humano y estratégico en Mendoza,
              Argentina.
            </p>
          </div>

          {/* h2, no h4: el pie arrancaba en h4 sin que hubiera h2 ni h3 antes,
              y eso deja saltos en el esquema de encabezados (I-A11Y-05). */}
          <div>
            <h2>Contacto</h2>
            <a href="mailto:estudiojuridicofernandezrr@gmail.com">
              estudiojuridicofernandezrr@gmail.com
            </a>
            <a href="tel:+542634210691">263 421 0691</a>
            <a href="tel:+542634759950">263 475 9950</a>
            <p>Mendoza, Argentina</p>
          </div>

          <div>
            <h2>Información</h2>
            <a href="#areas">Áreas de práctica</a>
            <a href="#turnos">Reservar turno</a>
            <a href="#faq">Preguntas frecuentes</a>
            <a href="/privacidad">Privacidad</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} IMPACTO Estudio Jurídico.</span>
          <span>
            La información del sitio no reemplaza asesoramiento legal.
          </span>
        </div>
      </div>
    </footer>
  );
}
