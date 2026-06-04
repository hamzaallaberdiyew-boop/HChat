import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from "./pages/LoginPage";
import ChatPage from "./pages/ChatPage";
import RegisterPage from "./pages/RegisterPage";

function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;