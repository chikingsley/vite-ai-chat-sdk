import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { customProvider } from "ai";
import { isTestEnvironment } from "../constants";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : null;

/**
 * Get a language model by ID.
 *
 * Gemini 2.5 and 3 models have native thinking/reasoning support:
 * - Gemini 2.5: Use `thinkingBudget` in providerOptions (0=off, -1=dynamic, or token count)
 * - Gemini 3: Use `thinkingLevel` in providerOptions ("minimal", "low", "medium", "high")
 *
 * Configure thinking per-request via providerOptions.google.thinkingConfig
 */
export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("chat-model");
  }

  return google(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return google("gemini-2.5-flash-lite");
}

export function getArtifactModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("artifact-model");
  }
  return google("gemini-2.5-flash-lite");
}
