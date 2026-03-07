import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { supabase } from "./utils/supabase";

import { Sidebar } from "./components/sidebar";
import { ChatPage } from "./pages/ChatPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AuthModal } from "./components/authModal";

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setSession(session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setShowAuthModal(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <div className="flex h-screen bg-app font-sans antialiased">
        {/* Pass all Auth state down to the Sidebar */}
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          session={session}
          onOpenAuth={() => setShowAuthModal(true)}
        />
        <main className="flex-1 flex flex-col items-center relative bg-app overflow-hidden">
          {/* TOP RIGHT: Just the Dark Mode Toggle now */}
          <div className="absolute top-6 right-6 flex items-center z-10">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 bg-card border border-border-main hover:bg-card-hover rounded-full transition-all text-card-text hover:text-card-text-hover shadow-sm"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <Routes>
            <Route path="/" element={<Navigate to="/new" replace />} />
            <Route
              path="/new"
              element={<ChatPage darkMode={darkMode} session={session} />}
            />
            <Route
              path="/chat/:chatId"
              element={<ChatPage darkMode={darkMode} session={session} />}
            />
            <Route
              path="/settings"
              element={
                session ? <SettingsPage /> : <Navigate to="/new" replace />
              }
            />
          </Routes>

          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
          />
        </main>
      </div>
    </Router>
  );
}

export default App;
