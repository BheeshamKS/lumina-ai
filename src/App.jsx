import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { supabase } from "./utils/supabase";

import { Sidebar } from "./components/sidebar";
import { ChatPage } from "./pages/ChatPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AuthModal } from "./components/authModal";
import { convertGuestToUser } from "./utils/chatHistory";

function App() {
  const [darkMode, setDarkMode] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // On mobile, default closed; on desktop, use saved pref
    if (typeof window !== "undefined" && window.innerWidth < 768) return false;
    return localStorage.getItem("lumina_sidebar") === "true";
  });

  const [session, setSession] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  useEffect(() => {
    // Only persist sidebar state on desktop
    if (!isMobile) localStorage.setItem("lumina_sidebar", sidebarOpen);
  }, [sidebarOpen, isMobile]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;

        setSession(initialSession);

        if (initialSession) {
          await convertGuestToUser(initialSession.user.id);
          if (window.location.href.includes("#")) {
            window.history.replaceState(
              null,
              "",
              window.location.href.split("#")[0],
            );
          }
        }
      } catch (error) {
        console.error("CRITICAL STARTUP ERROR:", error);
      } finally {
        setIsAppReady(true);
      }
    };

    initializeApp();

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
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sidebar-ring" />
      </div>
    );
  }

  const settingsElement = session ? (
    <SettingsPage
      darkMode={darkMode}
      onToggleDark={setDarkMode}
      session={session}
      setSidebarOpen={setSidebarOpen}
    />
  ) : (
    <Navigate to="/new" replace />
  );

  return (
    <Router>
      <div className="flex h-screen bg-app font-sans antialiased overflow-hidden">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          session={session}
          onOpenAuth={() => setShowAuthModal(true)}
        />

        <main className="flex-1 min-w-0 flex flex-col items-center relative bg-app overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/new" replace />} />
            <Route
              path="/new"
              element={
                <ChatPage
                  darkMode={darkMode}
                  session={session}
                  onOpenSidebar={() => setSidebarOpen(true)}
                  isMobile={isMobile}
                />
              }
            />
            <Route
              path="/chat/:chatId"
              element={
                <ChatPage
                  darkMode={darkMode}
                  session={session}
                  onOpenSidebar={() => setSidebarOpen(true)}
                  isMobile={isMobile}
                />
              }
            />

            <Route path="/settings" element={settingsElement} />
            <Route path="/settings/account" element={settingsElement} />
            <Route path="/settings/appearance" element={settingsElement} />
            <Route path="/settings/providers" element={settingsElement} />
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
