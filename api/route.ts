// import { OpenRouter } from "@openrouter/sdk";

export async function ask_chatbot(req) {
    const prompt = await req.json();
    
    // First API call with reasoning
    let response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        "model": "openrouter/free",
        "messages": [
            {
                "role": "user",
                "content": {role: "user", content: prompt.question}
            }
        ],
        "reasoning": {"enabled": true}
    })
    });

    // Extract the assistant message with reasoning_details and save it to the response variable
    const result = await response.json();
    response = result.choices[0].message;

    // Preserve the assistant message with reasoning_details
    const messages = [
    {
        role: 'user',
        content: prompt.question,
    },
    {
        role: 'assistant',
        content: response.content,
        reasoning_details: response.reasoning_details, // Pass back unmodified
    },
    {
        role: 'user',
        content: "Are you sure? Think carefully.",
    },
    ];

    // Second API call - model continues reasoning from where it left off
    const response2 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        "model": "openrouter/free",
        "messages": messages  // Includes preserved reasoning_details
    })
    });
    return new Response(JSON.stringify(await response2.json()));
}
