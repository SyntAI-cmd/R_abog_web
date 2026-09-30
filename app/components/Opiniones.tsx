"use client";

import { useEffect, useRef, useState } from "react";

type OpinionGoogle = { rating?: number; text?: { text?: string }; relativePublishTimeDescription?: string; publishTime?: string; authorAttribution?: { displayName?: string; uri?: string; photoUri?: string }; googleMapsUri?: string };
type Respuesta = { configured?: boolean; error?: boolean; name?: string; rating?: number; count?: number; reviewsUrl?: string; reviews?: OpinionGoogle[] };

const PREVIEWS = [
  ["Lorem ipsum", "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore."],
  ["Dolor sit amet", "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo."],
  ["Consectetur elit", "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla."],
  ["Tempor incididunt", "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim."],
] as const;

function Estrellas({ puntaje = 0 }: { puntaje?: number }) { const n=Math.max(0,Math.min(5,Math.round(puntaje))); return <span className="stars"><span aria-hidden="true">{"★".repeat(n)}{"☆".repeat(5-n)}</span><span className="sr-only">{n} de 5 estrellas</span></span> }

function PreviewOpiniones() {
  return <div className="preview-opiniones" aria-label="Vista previa de tarjetas de opiniones">
    <p className="preview-aviso"><strong>Vista previa de diseño.</strong> El contenido es demostrativo y será reemplazado por opiniones reales de Google.</p>
    <div className="preview-grid">{PREVIEWS.map(([titulo,texto],i)=><article className="preview-card" key={titulo}>
      <div className="preview-card-corner" aria-hidden="true"><span>→</span></div>
      <span className="preview-card-index" aria-hidden="true">0{i+1}</span>
      <Estrellas puntaje={5}/>
      <h3>{titulo}</h3>
      <p>{texto}</p>
      <small>Contenido de muestra</small>
    </article>)}</div>
  </div>;
}

export function Opiniones() {
  const [estado,setEstado]=useState<"cargando"|"listo"|"sin_configurar"|"error">("cargando");
  const [datos,setDatos]=useState<Respuesta>({reviews:[]});
  const carrusel=useRef<HTMLDivElement>(null);
  useEffect(()=>{let vigente=true;fetch('/api/google-reviews',{cache:'no-store'}).then(async r=>({ok:r.ok,data:await r.json() as Respuesta})).then(({ok,data})=>{if(!vigente)return;setDatos(data);setEstado(!data.configured?'sin_configurar':!ok||data.error?'error':'listo')}).catch(()=>vigente&&setEstado('error'));return()=>{vigente=false}},[]);
  const mover=(dir:number)=>carrusel.current?.scrollBy({left:dir*380,behavior:'smooth'});
  return <section className="section reviews" aria-labelledby="h-opiniones"><div className="container"><span className="eyebrow">Opiniones en Google</span><div className="reviews-head"><h2 id="h-opiniones" className="display section-title">Experiencias compartidas con transparencia.</h2>{estado==='listo'&&datos.rating&&<div className="google-resumen"><strong>{datos.rating.toFixed(1)}</strong><Estrellas puntaje={datos.rating}/><span>{datos.count} opiniones en Google</span><small>Información proporcionada por Google</small></div>}</div>
    {estado==='cargando'&&<div className="review-state" role="status"><span className="review-skeleton"/><span className="review-skeleton"/><span className="review-skeleton"/></div>}
    {estado==='sin_configurar'&&<PreviewOpiniones/>}
    {estado==='error'&&<div className="review-state review-state--mensaje" role="alert"><strong>No pudimos cargar las opiniones.</strong><p>Podés consultarlas directamente en Google o volver a intentar más tarde.</p></div>}
    {estado==='listo'&&(datos.reviews?.length??0)===0&&<div className="review-state review-state--mensaje"><strong>No hay opiniones disponibles para mostrar.</strong></div>}
    {estado==='listo'&&(datos.reviews?.length??0)>0&&<><div className="reviews-controls"><button type="button" onClick={()=>mover(-1)} aria-label="Opiniones anteriores">←</button><button type="button" onClick={()=>mover(1)} aria-label="Opiniones siguientes">→</button></div><div className="google-carousel" ref={carrusel}>{datos.reviews!.map((o,i)=><article className="review google-review" key={o.googleMapsUri||i}><header>{o.authorAttribution?.photoUri&&<img src={o.authorAttribution.photoUri} alt=""/>}<div><a href={o.authorAttribution?.uri} target="_blank" rel="noreferrer noopener"><strong>{o.authorAttribution?.displayName||'Usuario de Google'}</strong></a><div><Estrellas puntaje={o.rating}/> <time dateTime={o.publishTime}>{o.relativePublishTimeDescription||''}</time></div></div></header><p>“{o.text?.text||'Opinión sin texto.'}”</p>{o.googleMapsUri&&<a className="review-source" href={o.googleMapsUri} target="_blank" rel="noreferrer noopener">Ver reseña original en Google Maps</a>}</article>)}</div><p className="reviews-nota">Google ordena estas opiniones por relevancia. Google no verifica cada reseña, pero aplica políticas para detectar y retirar contenido falso.</p></>}
    {datos.reviewsUrl&&<a className="btn btn-dark" href={datos.reviewsUrl} target="_blank" rel="noreferrer noopener">Ver opiniones en Google</a>}
  </div></section>;
}
