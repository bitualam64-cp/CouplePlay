import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import LocalHub from "./pages/LocalHub";
import LocalGame from "./pages/LocalGame";
import OnlineHome from "./pages/OnlineHome";
import RoomPage from "./pages/Room";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/local" element={<LocalHub />} />
        <Route path="/local/:game" element={<LocalGame />} />
        <Route path="/online" element={<OnlineHome />} />
        <Route path="/room/:code" element={<RoomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
