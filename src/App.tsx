import { Route, Routes } from "react-router-dom";
import { ChatLayout } from "./layouts/chat-layout";
import { ChatPage } from "./pages/chat-page";
import { NewChatPage } from "./pages/new-chat-page";

export default function App() {
  return (
    <Routes>
      <Route element={<ChatLayout />}>
        <Route element={<NewChatPage />} path="/" />
        <Route element={<ChatPage />} path="/chat/:id" />
      </Route>
    </Routes>
  );
}
