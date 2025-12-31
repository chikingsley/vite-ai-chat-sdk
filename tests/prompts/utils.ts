// @ts-nocheck - Test utils with outdated API types
import type { LanguageModelV3StreamPart } from "@ai-sdk/provider";

const mockUsage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 20, text: 20, reasoning: 0 },
};

export function getResponseChunksByPrompt(
  _prompt: unknown,
  includeReasoning = false
): LanguageModelV3StreamPart[] {
  const chunks: LanguageModelV3StreamPart[] = [];

  if (includeReasoning) {
    chunks.push(
      { type: "reasoning-start" as const, id: "r1" },
      {
        type: "reasoning-delta" as const,
        id: "r1",
        delta: "Let me think about this.",
      },
      { type: "reasoning-end" as const, id: "r1" }
    );
  }

  chunks.push(
    { type: "text-start" as const, id: "t1" },
    { type: "text-delta" as const, id: "t1", delta: "Hello, world!" },
    { type: "text-end" as const, id: "t1" },
    { type: "finish" as const, finishReason: "stop" as const, usage: mockUsage }
  );

  return chunks;
}
