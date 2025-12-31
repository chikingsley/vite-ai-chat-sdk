// Client-side actions for Vite (no server actions)
import type { VisibilityType } from "@/components/visibility-selector";

export function saveChatModelAsCookie(model: string) {
  document.cookie = `chat-model=${encodeURIComponent(model)}; path=/; max-age=31536000`;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  await fetch(`/api/messages/${id}/trailing`, {
    method: "DELETE",
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await fetch(`/api/chat/${chatId}/visibility`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visibility }),
  });
}
