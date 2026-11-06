import type { CanalConversa } from "@prisma/client";

export function IconeCanal({ canal }: { canal: CanalConversa }) {
  const rotulo = canal === "WHATSAPP" ? "WhatsApp" : canal === "INSTAGRAM" ? "Instagram" : canal === "EMAIL" ? "E-mail" : canal === "TELEFONE" ? "Telefone" : "Outro";
  return (
    <span className={`icone-canal ${canal.toLowerCase()}`} title={rotulo} aria-label={rotulo}>
      {canal === "WHATSAPP" ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M5 16.5 3.5 20.5 8 18.2A8.5 8.5 0 1 0 5 16.5z" /></svg>
      ) : null}
      {canal === "INSTAGRAM" ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.5" /><circle cx="17" cy="7" r="0.8" fill="currentColor" /></svg>
      ) : null}
      {canal === "EMAIL" ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4 7 8 6 8-6" /></svg>
      ) : null}
      {canal === "TELEFONE" ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M8 4.5h2.2l1.2 3-1.6 1a12 12 0 0 0 5.7 5.7l1-1.6 3 1.2V16a2 2 0 0 1-2.2 2A14.5 14.5 0 0 1 6 6.7 2 2 0 0 1 8 4.5z" /></svg>
      ) : null}
      {canal === "OUTRO" ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="12" cy="12" r="7" /><path d="M12 8v5M12 16.5h.01" /></svg>
      ) : null}
    </span>
  );
}
