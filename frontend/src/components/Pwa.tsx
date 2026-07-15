"use client";

import { useEffect, useState } from "react";

/* ---------------------------------------------------------------------------
   PWA do PDV2: registrar o service worker e oferecer a instalacao ("atalho em
   tela cheia" no tablet/celular do caixa).

   Dois caminhos, porque os sistemas diferem:
   - Android/Chrome dispara `beforeinstallprompt` -> instala com 1 toque.
   - iOS/Safari NAO tem esse evento: instala pelo menu Compartilhar -> "Adicionar
     a Tela de Inicio". Entao no iOS mostramos as instrucoes.

   Licao (do BizuApp): NAO depender so do `beforeinstallprompt` — no Android ele
   nao dispara na 1a visita. Por isso o botao fica SEMPRE visivel; se o prompt
   nativo ainda nao veio, mostra o passo a passo manual.

   Sem lib de icones no PDV2 -> SVG inline.
   --------------------------------------------------------------------------- */

const GOLD = "#A16207";

/* icones inline (sem dependencia) */
const IcDownload = (p: { size?: number }) => (
  <svg width={p.size ?? 20} height={p.size ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const IcShare = (p: { size?: number }) => (
  <svg width={p.size ?? 16} height={p.size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);
const IcMore = (p: { size?: number }) => (
  <svg width={p.size ?? 16} height={p.size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
  </svg>
);
const IcPlus = (p: { size?: number }) => (
  <svg width={p.size ?? 14} height={p.size ?? 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IcX = (p: { size?: number }) => (
  <svg width={p.size ?? 17} height={p.size ?? 17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IcChevron = (p: { size?: number }) => (
  <svg width={p.size ?? 16} height={p.size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export function RegistraSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const reg = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
      if (document.readyState === "complete") reg();
      else window.addEventListener("load", reg, { once: true });
    }
  }, []);
  return null;
}

interface PromptInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Plataforma = "ios" | "android" | "desktop";

function detectar(): Plataforma {
  const ua = navigator.userAgent;
  const ios =
    /iphone|ipad|ipod/i.test(ua) ||
    (/Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document);
  if (ios) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

const CHAVE_DISPENSADO = "pdv-instalar-dispensado";
const CHAVE_COLAPSADO = "pdv-instalar-colapsado";

/**
 * @param persistente no dashboard nao some de vez: o "x" so encolhe numa barrinha
 *   ate instalar. Fora dele (ex: login), dispensa de vez.
 */
export function InstalarApp({ persistente = false }: { persistente?: boolean }) {
  const [evento, setEvento] = useState<PromptInstalar | null>(null);
  const [plataforma, setPlataforma] = useState<Plataforma>("desktop");
  const [instrucoes, setInstrucoes] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const [colapsado, setColapsado] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    if (!persistente && localStorage.getItem(CHAVE_DISPENSADO) === "1") return;

    setPlataforma(detectar());
    if (persistente) setColapsado(localStorage.getItem(CHAVE_COLAPSADO) === "1");
    setVisivel(true);

    const aoPrompt = (e: Event) => {
      e.preventDefault();
      setEvento(e as PromptInstalar);
    };
    window.addEventListener("beforeinstallprompt", aoPrompt);
    const aoInstalar = () => setVisivel(false);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoPrompt);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, [persistente]);

  function fechar() {
    if (persistente) {
      setColapsado(true);
      setInstrucoes(false);
      try { localStorage.setItem(CHAVE_COLAPSADO, "1"); } catch {}
    } else {
      setVisivel(false);
      try { localStorage.setItem(CHAVE_DISPENSADO, "1"); } catch {}
    }
  }

  function expandir() {
    setColapsado(false);
    try { localStorage.removeItem(CHAVE_COLAPSADO); } catch {}
  }

  async function acao() {
    if (evento) {
      await evento.prompt();
      await evento.userChoice;
      setEvento(null);
      setVisivel(false);
      return;
    }
    setInstrucoes((v) => !v);
  }

  if (!visivel) return null;

  if (persistente && colapsado) {
    return (
      <button
        type="button"
        onClick={() => { if (evento) void acao(); else { expandir(); setInstrucoes(true); } }}
        className="mb-4 flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors"
        style={{ borderColor: `${GOLD}40`, background: `${GOLD}0d` }}
      >
        <span style={{ color: GOLD }}><IcDownload size={16} /></span>
        <span className="flex-1 text-[13px] font-semibold text-gray-800">Instalar o PDVCloset</span>
        <span className="text-gray-400"><IcChevron /></span>
      </button>
    );
  }

  const rotulo = evento ? "Instalar" : "Ver como";

  return (
    <div className="mb-4 rounded-lg border p-3.5" style={{ borderColor: `${GOLD}40`, background: `${GOLD}0d` }}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg text-white" style={{ background: GOLD }}>
          <IcDownload />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-gray-900">Instalar o PDVCloset</p>
          <p className="text-[12px] leading-snug text-gray-600">
            Vira um ícone no tablet/celular e abre em tela cheia, como um app.
          </p>
        </div>
        <button
          type="button"
          onClick={acao}
          className="grid min-h-[38px] flex-shrink-0 place-items-center rounded-lg px-3.5 text-[13px] font-bold text-white transition-transform active:scale-95"
          style={{ background: GOLD }}
        >
          {rotulo}
        </button>
        <button
          type="button"
          onClick={fechar}
          aria-label={persistente ? "Minimizar" : "Agora não"}
          className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-gray-400 transition-colors hover:text-gray-600"
        >
          <IcX />
        </button>
      </div>

      {!evento && instrucoes ? (
        <div className="mt-3 border-t pt-3 text-[13px] text-gray-600" style={{ borderColor: `${GOLD}26` }}>
          {plataforma === "ios" ? (
            <ol className="space-y-2">
              <li className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-gray-800">1. Toque em Compartilhar</span>
                <span style={{ color: GOLD }}><IcShare /></span>
                <span>na barra do Safari.</span>
              </li>
              <li className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-gray-800">2. Escolha</span>
                <span className="inline-flex items-center gap-1 rounded bg-white px-1.5 py-0.5 ring-1 ring-gray-200">
                  <IcPlus /> Adicionar à Tela de Início
                </span>
              </li>
              <li><span className="font-semibold text-gray-800">3. Confirme</span> em Adicionar.</li>
            </ol>
          ) : plataforma === "android" ? (
            <ol className="space-y-2">
              <li className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-gray-800">1. Abra o menu</span>
                <span style={{ color: GOLD }}><IcMore /></span>
                <span>do navegador.</span>
              </li>
              <li>
                <span className="font-semibold text-gray-800">2. Toque em</span>{" "}
                <span className="rounded bg-white px-1.5 py-0.5 ring-1 ring-gray-200">Instalar app</span> ou{" "}
                <span className="rounded bg-white px-1.5 py-0.5 ring-1 ring-gray-200">Adicionar à tela inicial</span>.
              </li>
              <li><span className="font-semibold text-gray-800">3. Confirme.</span></li>
            </ol>
          ) : (
            <ol className="space-y-2">
              <li><span className="font-semibold text-gray-800">1.</span> No Chrome/Edge, clique no ícone de instalar na barra de endereço.</li>
              <li><span className="font-semibold text-gray-800">2.</span> Confirme em <span className="rounded bg-white px-1.5 py-0.5 ring-1 ring-gray-200">Instalar</span>.</li>
            </ol>
          )}
        </div>
      ) : null}
    </div>
  );
}
