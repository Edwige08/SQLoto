import { NextRequest, NextResponse } from "next/server";
import { answerQuestion } from "@/lib/pipeline";
import { ConversationState, EMPTY_CONVERSATION } from "@/lib/conversation";

interface ChatRequestBody {
  question?: unknown;
  conversation?: unknown;
}

export async function POST(request: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête JSON invalide." },
      { status: 400 }
    );
  }

  if (typeof body.question !== "string" || body.question.trim().length === 0) {
    return NextResponse.json(
      { error: "Le champ 'question' est requis et doit être une chaîne non vide." },
      { status: 400 }
    );
  }

  const conversation: ConversationState =
    body.conversation &&
    typeof body.conversation === "object" &&
    Array.isArray((body.conversation as ConversationState).recentTurns)
      ? (body.conversation as ConversationState)
      : EMPTY_CONVERSATION;

  try {
    const result = await answerQuestion(body.question, conversation);
    return NextResponse.json({
      reponse: result.reponse,
      conversation: result.conversation,
      debug: result.debug,
    });
  } catch (err) {
    console.error("[api/chat] Erreur inattendue :", err);
    return NextResponse.json(
      { error: "Une erreur technique est survenue. Réessaie dans un instant." },
      { status: 500 }
    );
  }
}