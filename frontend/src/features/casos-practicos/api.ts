// src/features/casos-practicos/api.ts
import type { EstructuraPayload } from "./FormCasePractices";

export async function generarEstructuraPDF(data: EstructuraPayload): Promise<Blob> {
  const res = await fetch("/api/estructura/generar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    // lee el cuerpo de error
    const errText = ct.includes("application/json")
      ? JSON.stringify(await res.json())
      : await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${errText}`);
  }

  if (!ct.includes("application/pdf")) {
    // algunos servidores no envían content-type correcto: igual intentamos
    console.warn("Content-Type inesperado:", ct);
  }

  return await res.blob(); // debería ser application/pdf
}