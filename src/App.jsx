import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { supabase } from "./utils/supabase";

import { Sidebar } from "./components/sidebar";
import { ChatPage } from "./pages/ChatPage";
import { SettingsPage } from "./pages/SettingsPage";

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState(null);

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
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setSession(session),
    );
    return () => subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <div className="flex h-screen bg-app font-sans antialiased">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 flex flex-col items-center relative bg-app overflow-hidden">
          <div className="absolute top-6 right-6 flex items-center gap-3 z-10">
            <div className="px-3 py-1 bg-card border border-border-main rounded-full text-[12px] text-card-text flex gap-2 shadow-sm">
              <span>{session ? "Pro Plan" : "Guest Mode"}</span>
              <span className="opacity-30">|</span>
              {session ? (
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="hover:text-accent transition-colors"
                >
                  Sign Out
                </button>
              ) : (
                <span className="text-placeholder">3 free prompts</span>
              )}
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-card-hover rounded-full transition-all text-card-text hover:text-card-text-hover"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          <Routes>
            <Route
              path="/"
              element={<ChatPage darkMode={darkMode} session={session} />}
            />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
