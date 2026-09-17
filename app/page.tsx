"use client";
import Image from "next/image";

import { useState, useRef, useEffect } from "react";
import type { ConversationState } from "@/lib/conversation";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  debug?: {
    modelUsed: string | null;
    sqlExecuted: string | null;
    dureeGenerationMs: number;
    dureeExecutionMs: number | null;
  };
  isError?: boolean;
}

const EXEMPLES = [
  "Quels sont les dix numéros les plus fréquents le mercredi ?",
  "Combien de fois le numéro 12 est-il sorti depuis janvier 2026 ?",
  "Quel numéro n'est pas apparu depuis le plus longtemps ?",
  "Quand les numéros 7 et 23 sont-ils sortis ensemble pour la dernière fois ?",
];

const BALL_COLORS = [
  { range: "1–9", hex: "#F4F1EA" },
  { range: "10–19", hex: "#3E6FA6" },
  { range: "20–29", hex: "#C15B7C" },
  { range: "30–39", hex: "#8B8F94" },
  { range: "40–49", hex: "#7FA65C" },
];

export default function Home() {

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [conversation, setConversation] = useState<ConversationState>({
    summary: null,
    recentTurns: [],
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);
  
  async function sendQuestion(question: string) {
    if (!question.trim() || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, conversation }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error ?? "Une erreur est survenue.", isError: true },
        ]);
        return;
      }

      setConversation(data.conversation);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reponse, debug: data.debug },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Impossible de contacter le serveur. Vérifie ta connexion et réessaie.",
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <nav className="flex items-center justify-between w-full max-w-3xl border-b border-gray-200 dark:border-gray-700 py-5 px-16 bg-white dark:bg-black">
        <Image
          src="/logo_sqloto.png"
          alt="SQLoto Logo"
          width={188}
          height={77}
        />
      </nav>
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-5 px-16 bg-violet-100 dark:bg-black sm:items-start">

        <div>
          <div className="flex items-center gap-3">
            <h1 className="my-5 font-bold text-xl">Bienvenue sur SQLoto !</h1>
            <div className="flex gap-2">
              {BALL_COLORS.map((b) => (
                <span
                  key={b.range}
                  className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: b.hex }}
                  aria-hidden
                />
              ))}
            </div>
          </div>
          <p>SQLoto vous permet de poser des questions sur l&apos;historique des tirages FDJ.</p>
        </div>

        <form
          className="flex flex-col w-full"
          onSubmit={(e) => {
            e.preventDefault();
            sendQuestion(input);
          }}>
            
          <div className="flex-1 space-y-5 pb-4 mt-5">
            {messages.length === 0 && (
              <div className="rounded-md border border-[#E4E2DC] bg-[#FAFAF8] p-5">
                <p className="mb-3">Quelques questions pour commencer :</p>
                <div className="flex flex-col items-start gap-2">
                  {EXEMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => sendQuestion(ex)}
                      className="text-left text-sm text-[#2A398C] underline decoration-[#3E6FA6]/30 underline-offset-4 hover:decoration-[#2A398C] hover:cursor-pointer"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-md border border-[#E4E2DC] bg-[#FAFAF8] px-4 py-2.5 text-[15px] text-[#1C2128]">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="max-w-[90%]">
                  <div
                    className={`border-l-2 pl-4 text-[15px] leading-relaxed ${
                      m.isError ? "border-[#C15B7C] text-[#8A3A50]" : "border-[#3E6FA6] text-[#1C2128]"
                    }`}>
                    {m.content}
                  </div>
                  {m.debug && (
                    <details className="ml-4 mt-1.5 text-xs text-[#9498A0]">
                      <summary className="cursor-pointer select-none hover:text-[#6B7178]">
                        Détails techniques
                      </summary>
                      <dl className="mt-2 space-y-1 font-mono">
                        <div>
                          <dt className="inline text-[#B0B4BA]">modèle : </dt>
                          <dd className="inline">{m.debug.modelUsed ?? "—"}</dd>
                        </div>
                        {m.debug.sqlExecuted && (
                          <div>
                            <dt className="text-[#B0B4BA]">sql exécuté :</dt>
                            <dd className="mt-0.5 whitespace-pre-wrap break-words rounded bg-[#F4F3EF] p-2">
                              {m.debug.sqlExecuted}
                            </dd>
                          </div>
                        )}
                        <div>
                          <dt className="inline text-[#B0B4BA]">durée génération : </dt>
                          <dd className="inline">{m.debug.dureeGenerationMs} ms</dd>
                          {m.debug.dureeExecutionMs !== null && (
                            <>
                              <dt className="inline text-[#B0B4BA]"> · exécution : </dt>
                              <dd className="inline">{m.debug.dureeExecutionMs} ms</dd>
                            </>
                          )}
                        </div>
                      </dl>
                    </details>
                  )}
                </div>
              )
            )}

            {loading && (
              <div className="border-l-2 border-[#E4E2DC] pl-4 text-[15px] text-[#9498A0]">
                Recherche en cours…
              </div>
            )}
            <div ref={scrollRef} />
          </div>
            
          <div className="flex flex-col">
            <textarea
              name="sqlQuery" 
              id="sqlQuery" 
              placeholder="Entrez votre question ici..." 
              className="border border-gray-500 p-2 w-full min-h-20 bg-white"
              maxLength={300}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              // className="flex-1 rounded-md border border-[#D9D7D0] px-3.5 py-2.5 text-[15px] outline-none focus:border-[#3E6FA6] focus:ring-1 focus:ring-[#3E6FA6] disabled:opacity-60"
              
            />
            <button 
              className="mt-4 bg-[#2a398c] hover:bg-[#303A73] text-white px-4 py-2 rounded hover:cursor-pointer"
              type="submit"
              disabled={loading || !input.trim()}
            >
              Exécuter la requête
            </button>
          </div>
          
        </form>

        <footer className="flex mx-auto mt-4 text-center text-sm text-gray-500">
          © 2026 SQLoto. Tous droits réservés. <br />
          Edwige Saves
        </footer>
        
      </main>
    </div>
  );
}
