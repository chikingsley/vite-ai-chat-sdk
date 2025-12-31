import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import type { ChatMessage } from "@/lib/types";
import { convertToUIMessages } from "@/lib/utils";

interface ChatData {
  id: string;
  visibility: "public" | "private";
  userId: string;
}

export function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [chat, setChat] = useState<ChatData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadChat() {
      if (!id) {
        navigate("/");
        return;
      }

      try {
        // Fetch chat data
        const chatResponse = await fetch(`/api/chat/${id}`);
        if (!chatResponse.ok) {
          navigate("/");
          return;
        }
        const chatData = await chatResponse.json();
        setChat(chatData);

        // Fetch messages
        const messagesResponse = await fetch(`/api/chat/${id}/messages`);
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          setMessages(convertToUIMessages(messagesData));
        }
      } catch (error) {
        console.error("Failed to load chat:", error);
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    }

    loadChat();
  }, [id, navigate]);

  if (isLoading) {
    return <div className="flex h-dvh" />;
  }

  if (!chat || !id) {
    return null;
  }

  const modelId = localStorage.getItem("chat-model") || DEFAULT_CHAT_MODEL;

  return (
    <>
      <Chat
        autoResume={true}
        id={chat.id}
        initialChatModel={modelId}
        initialMessages={messages}
        initialVisibilityType={chat.visibility}
        isReadonly={false}
      />
      <DataStreamHandler />
    </>
  );
}
