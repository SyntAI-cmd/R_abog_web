import Image from "next/image";

export function Marca({ compacta = false }: { compacta?: boolean }) {
  return (
    <span className={`marca ${compacta ? "marca--compacta" : ""}`}>
      <Image className="marca-isotipo" src="/impacto-isotipo.png" alt="" width={1240} height={1240} priority />
      <span className="marca-texto">
        <strong>IMPACTO</strong>
        <small>ESTUDIO JURÍDICO</small>
      </span>
    </span>
  );
}
