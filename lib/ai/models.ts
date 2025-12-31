// Google Gemini models (using @ai-sdk/google directly)
export const DEFAULT_CHAT_MODEL = "gemini-3-flash-preview";

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  // Google Gemini 3 Series
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    provider: "google",
    description: "Pro-level intelligence at flash speed (default)",
  },
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro",
    provider: "google",
    description: "Most capable Google model for complex tasks",
  },
  // Google Gemini 2.5 Series
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    description: "Fast and capable for most tasks",
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "google",
    description: "Ultra fast and affordable",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    description: "Advanced reasoning and coding",
  },
];

// Group models by provider for UI
export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);
