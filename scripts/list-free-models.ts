// scripts/list-free-models.ts
//
// Interroge l'API OpenRouter en direct pour lister les modèles actuellement
// gratuits et supportant les sorties structurées (json_schema).
// Usage : pnpm exec tsx scripts/list-free-models.ts

async function main() {
  const response = await fetch("https://openrouter.ai/api/v1/models");
  const data = await response.json();

  const freeModels = data.data.filter((model: any) => {
    const isFree =
      model.pricing?.prompt === "0" && model.pricing?.completion === "0";
    const supportsStructured =
      model.supported_parameters?.includes("response_format") ||
      model.supported_parameters?.includes("structured_outputs");
    const isTextModel = model.architecture?.output_modalities?.includes("text");
    return isFree && supportsStructured && isTextModel;
  });

  console.log(`Modèles gratuits avec support des sorties structurées : ${freeModels.length}\n`);
  for (const m of freeModels) {
    console.log(`${m.id}  (contexte: ${m.context_length})`);
  }
}

main();
