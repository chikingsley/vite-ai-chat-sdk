import { Route, Routes } from "react-router-dom";
import { ChatLayout } from "./layouts/ChatLayout";
import { ChatPage } from "./pages/ChatPage";
import { NewChatPage } from "./pages/NewChatPage";

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
