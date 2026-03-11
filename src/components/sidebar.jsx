import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  LayoutGrid,
  Settings,
  Trash2,
  LogIn,
  LogOut,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../utils/supabase";
import { getConversations, archiveConversation } from "../utils/chatHistory";

// Every item follows the same pattern:
// [fixed w-12 icon slot] [animated label]
const SidebarItem = ({ icon, label, isOpen, to }) => (
  <Link
    to={to || "#"}
    className="flex items-center w-full py-2.5 rounded-xl text-card-text hover:bg-card-hover hover:text-card-text-hover transition-colors"
  >
    <div className="w-12 shrink-0 flex items-center justify-center">{icon}</div>
    <span
      className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        isOpen ? "opacity-100 w-40" : "opacity-0 w-0"
      }`}
    >
      {label}
    </span>
  </Link>
);

const RecentItem = ({ id, title, currentChatId, onArchive }) => {
  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    onArchive(id);
  };
  return (
    <Link
      to={`/chat/${id}`}
      className={`group flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
        currentChatId === id
          ? "bg-card-hover text-card-text-hover font-medium"
          : "text-card-text hover:bg-card-hover"
      }`}
    >
      <span className="truncate pr-2 flex-1">{title}</span>
      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-[#FE8181] hover:bg-[#FE8181]/10 rounded-md transition-all shrink-0"
      >
        <Trash2 size={14} />
      </button>
    </Link>
  );
};

export const Sidebar = ({
  sidebarOpen,
  setSidebarOpen,
  session,
  onOpenAuth,
}) => {
  const location = useLocation();
  const currentChatId = location.pathname.split("/chat/")[1];

  const [recentChats, setRecentChats] = useState([]);
  const [displayName, setDisplayName] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const CHATS_PER_PAGE = 15;
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setIsDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSidebarData = async () => {
      setPage(0);
      const chats = await getConversations(0, CHATS_PER_PAGE);
      setRecentChats(chats);
      setHasMore(chats.length === CHATS_PER_PAGE);

      if (session?.user) {
        const metaName =
          session.user.user_metadata?.["Display name"] ||
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name;
        if (metaName) {
          setDisplayName(metaName);
          return;
        }

        setDisplayName(session.user.email?.split("@")[0] || "User");
      }
    };
    fetchSidebarData();
  }, [location.pathname, session]);

  const loadMoreChats = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const newChats = await getConversations(nextPage, CHATS_PER_PAGE);
    if (newChats.length > 0) {
      setRecentChats((prev) => [...prev, ...newChats]);
      setPage(nextPage);
    }
    if (newChats.length < CHATS_PER_PAGE) setHasMore(false);
    setIsLoadingMore(false);
  };

  const handleArchive = async (id) => {
    setRecentChats((prev) => prev.filter((c) => c.id !== id));
    try {
      await archiveConversation(id);
    } catch {
      const chats = await getConversations();
      setRecentChats(chats);
    }
  };

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    await supabase.auth.signOut();
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    // Outer wrapper: owns the width animation + clips the w-72 aside
    <div
      ref={dropdownRef}
      className="relative h-full z-30 shrink-0 overflow-hidden border-r border-sidebar-border"
      style={{
        width: sidebarOpen ? "288px" : "48px",
        transition: "width 300ms cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* Dropdown outside aside so overflow-hidden doesn't clip it */}
      {isDropdownOpen && session && (
        <div className="absolute bottom-16 left-2 right-2 mb-2 bg-card border border-border-main rounded-xl shadow-lg overflow-hidden z-50">
          <Link
            to="/settings"
            onClick={() => setIsDropdownOpen(false)}
            className="w-full flex items-center px-4 py-3 text-sm text-card-text hover:bg-card-hover transition-colors border-b border-border-main"
          >
            <Settings size={16} className="mr-3" /> Settings
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center px-4 py-3 text-sm text-[#FE8181] hover:bg-[#FE8181]/10 transition-colors"
          >
            <LogOut size={16} className="mr-3" /> Sign out
          </button>
        </div>
      )}

      {/* Aside is always w-72, never animates — wrapper clips it */}
      <aside className="w-72 h-full bg-card flex flex-col">
        <div className="pt-3 flex flex-col h-full">
          {/* HEADER
              CRITICAL: toggle button is FIRST in the DOM (leftmost = always visible).
              Wordmark comes after and fades in to the right. */}
          <div className="flex items-center mb-6">
            {/* Toggle — always at x=0, never moves */}
            <div className="w-12 shrink-0 flex items-center justify-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 hover:bg-card-hover rounded-md transition-colors"
              >
                <LayoutGrid
                  size={18}
                  className="text-card-text hover:text-card-text-hover transition-colors"
                />
              </button>
            </div>
            {/* Wordmark fades in beside the toggle */}
            <div
              className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                sidebarOpen ? "opacity-100 w-48" : "opacity-0 w-0"
              }`}
            >
              <span className="font-medium font-serif text-[22px] tracking-tight text-card-text-hover">
                Lumina
              </span>
            </div>
          </div>

          {/* NAV ITEMS */}
          <div className="space-y-0.5">
            <SidebarItem
              icon={<Plus size={20} />}
              label="New chat"
              isOpen={sidebarOpen}
              to="/new"
            />
            <SidebarItem
              icon={<Search size={20} />}
              label="Search"
              isOpen={sidebarOpen}
              to="#"
            />
          </div>

          {/* RECENTS */}
          <div
            className={`mt-8 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-2 transition-opacity duration-300 ${
              sidebarOpen
                ? "opacity-100"
                : "opacity-0 invisible pointer-events-none"
            }`}
            onScroll={(e) => {
              const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
              if (scrollHeight - scrollTop <= clientHeight + 20)
                loadMoreChats();
            }}
          >
            <p className="text-[11px] font-extralight text-placeholder tracking-wider px-1 mb-2 uppercase">
              Recents
            </p>
            <div className="space-y-0.5">
              {recentChats.map((chat) => (
                <RecentItem
                  key={chat.id}
                  id={chat.id}
                  title={chat.title}
                  currentChatId={currentChatId}
                  onArchive={handleArchive}
                />
              ))}
              {recentChats.length === 0 && (
                <p className="px-3 py-2 text-[12px] text-placeholder italic">
                  No recent chats
                </p>
              )}
              {isLoadingMore && (
                <div className="flex justify-center py-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-sidebar-ring" />
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM PROFILE — toggle first pattern, avatar always at x=0 */}
          <div className="mt-auto w-full">
            {session ? (
              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`w-full flex items-center cursor-pointer group py-4 hover:bg-card-hover transition-colors ${sidebarOpen ? "border-t border-sidebar-border" : "border-transparent"}`}
              >
                <div className="w-12 shrink-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-[#2c2a27] dark:bg-[#c2c0b6] text-white dark:text-[#1a1918] rounded-full flex items-center justify-center text-[14px] font-normal leading-none pt-[1px]">
                    {getInitials(displayName)}
                  </div>
                </div>
                <div
                  className={`flex flex-col overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                    sidebarOpen ? "opacity-100 w-40" : "opacity-0 w-0"
                  }`}
                >
                  <span className="text-sm font-semibold text-card-text truncate group-hover:text-card-text-hover transition-colors">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-placeholder group-hover:text-card-text-hover transition-colors">
                    Pro Plan
                  </span>
                </div>
              </div>
            ) : (
              <div
                onClick={onOpenAuth}
                className={`w-full flex items-center cursor-pointer group py-4 hover:bg-card-hover transition-colors ${sidebarOpen ? "border-t border-sidebar-border" : "border-transparent"}`}
              >
                <div className="w-12 shrink-0 flex items-center justify-center">
                  <LogIn
                    size={20}
                    className="text-accent group-hover:text-accent/80 transition-colors"
                  />
                </div>
                <span
                  className={`text-sm font-medium text-accent overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                    sidebarOpen ? "opacity-100 w-36" : "opacity-0 w-0"
                  }`}
                >
                  Sign in or Sign up
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
