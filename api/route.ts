import { NextRequest } from "next/server";

interface OpenRouterMessage {
  role: string;
  content: string;
  reasoning_details?: unknown;
}

interface OpenRouterResponse {
  choices: {
    message: OpenRouterMessage;
  }[];
}

export async function ask_chatbot(req: NextRequest) {
  const prompt = await req.json();

  // First API call with reasoning
  const firstResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openrouter/free",
      messages: [
        {
          role: "user",
          content: prompt.question,
        },
      ],
      reasoning: { enabled: true },
    }),
  });

  const firstResult: OpenRouterResponse = await firstResponse.json();
  const assistantMessage = firstResult.choices[0].message;

  // Preserve the assistant message with reasoning_details
  const messages = [
    {
      role: "user",
      content: prompt.question,
    },
    {
      role: "assistant",
      content: assistantMessage.content,
      reasoning_details: assistantMessage.reasoning_details, // Pass back unmodified
    },
    {
      role: "user",
      content: "Are you sure? Think carefully.",
    },
  ];

  // Second API call - model continues reasoning from where it left off
  const secondResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openrouter/free",
      messages: messages, // Includes preserved reasoning_details
    }),
  });

  return new Response(JSON.stringify(await secondResponse.json()));
}
