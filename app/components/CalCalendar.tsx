"use client";

import dynamic from "next/dynamic";
import { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";
import { CAL_NAMESPACE, ZONA_HORARIA } from "../../lib/turnero-config";

const Cal = dynamic(() => import("@calcom/embed-react"), {
  ssr: false,
  loading: () => <p className="cal-estado" role="status">Cargando agenda...</p>,
});

export function CalCalendar({ calLink }: { calLink: string }) {
  useEffect(() => {
    if (!calLink) return;
    let vigente = true;

    void getCalApi({ namespace: CAL_NAMESPACE }).then((cal) => {
      if (!vigente) return;
      cal("ui", {
        hideEventTypeDetails: true,
        theme: "light",
        styles: {
          branding: { brandColor: "#123d3d" },
          body: { background: "#ffffff" },
        },
      });
    });

    return () => {
      vigente = false;
    };
  }, [calLink]);

  if (!calLink) return null;

  return (
    <div className="cal-contenedor" aria-label="Calendario de turnos">
      <Cal
        namespace={CAL_NAMESPACE}
        calLink={calLink}
        calOrigin="https://cal.com"
        style={{ width: "100%", height: "100%", overflow: "auto" }}
        config={{ layout: "month_view", theme: "light", timezone: ZONA_HORARIA }}
      />
    </div>
  );
}
