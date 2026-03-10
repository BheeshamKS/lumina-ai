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
import { convertGuestToUser } from "./utils/chatHistory";

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        await convertGuestToUser(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (session) {
        setShowAuthModal(false);
        await convertGuestToUser(session.user.id);

        if (window.location.href.includes("#")) {
          window.history.replaceState(
            null,
            "",
            window.location.href.split("#")[0],
          );
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // 1. Check session and migrate BEFORE the app ever renders
    const initializeApp = async () => {
      try {
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error; // If Supabase fails, catch it

        setSession(initialSession);

        if (initialSession) {
          await convertGuestToUser(initialSession.user.id);

          // Scrub the URL cleanly
          if (window.location.href.includes("#")) {
            window.history.replaceState(
              null,
              "",
              window.location.href.split("#")[0],
            );
          }
        }
      } catch (error) {
        // If literally anything breaks, it will print here instead of freezing the app
        console.error("🔥 CRITICAL STARTUP ERROR:", error);
      } finally {
        // 🚨 THE FAIL-SAFE: This runs 100% of the time, guaranteeing the app unlocks!
        setIsAppReady(true);
      }
    };

    initializeApp();

    // 2. Listen for normal logouts/logins while using the app
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);

      if (newSession && event === "SIGNED_IN") {
        setShowAuthModal(false);
        await convertGuestToUser(newSession.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isAppReady) {
    return (
      <div className="flex h-screen w-screen bg-app items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sidebar-ring"></div>
      </div>
    );
  }

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
                session ? (
                  <SettingsPage
                    darkMode={darkMode}
                    onToggleDark={setDarkMode}
                    session={session}
                  />
                ) : (
                  <Navigate to="/new" replace />
                )
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
