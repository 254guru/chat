import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "@/components/layout/LoginPage";
import { ChatPage } from "@/components/layout/ChatPage";
import { useChatStore } from "@/store/chatStore";

export default function App() {
  const username = useChatStore((s) => s.username);
  return (
    <BrowserRouter>
      <div className="dark h-full">
        <Routes>
          <Route path="/"     element={username ? <Navigate to="/chat" replace /> : <LoginPage />} />
          <Route path="/chat" element={username ? <ChatPage /> : <Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
