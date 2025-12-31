import { Routes, Route } from "react-router-dom";
import { ChatLayout } from "./layouts/ChatLayout";
import { NewChatPage } from "./pages/NewChatPage";
import { ChatPage } from "./pages/ChatPage";

export default function App() {
  return (
    <Routes>
      <Route element={<ChatLayout />}>
        <Route path="/" element={<NewChatPage />} />
        <Route path="/chat/:id" element={<ChatPage />} />
      </Route>
    </Routes>
  );
}
