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

const SidebarItem = ({ icon, label, isOpen, to, isActive }) => (
  <Link
    to={to || "#"}
    className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} py-2.5 hover:bg-card-hover rounded-xl cursor-pointer text-card-text hover:text-card-text-hover transition-colors`}
  >
    <div className="shrink-0">{icon}</div>
    <span
      className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "w-48 ml-3 opacity-100" : "w-0 ml-0 opacity-0"}`}
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
      <div className="flex items-center gap-2 truncate flex-1">
        <span className="truncate pr-2">{title}</span>
      </div>
      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-[#FE8181] hover:bg-[#FE8181]/10 rounded-md transition-all"
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

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSidebarData = async () => {
      const chats = await getConversations();
      setRecentChats(chats);

      if (session?.user) {
        // 1. FASTEST WAY: Check if Supabase already sent the name in the auth session metadata
        const metaName =
          session.user.user_metadata?.["Display name"] ||
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name;

        if (metaName) {
          setDisplayName(metaName);
          return; // We found the name! Skip the database call entirely.
        }

        // 2. FALLBACK WAY: Query the public database table
        try {
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (error) {
            console.error("Supabase Error fetching name:", error.message);
          }

          if (data && data["Display name"]) {
            setDisplayName(data["Display name"]);
          } else {
            setDisplayName("User");
          }
        } catch (err) {
          console.error("Failed to fetch user:", err);
          setDisplayName("User");
        }
      }
    };
    fetchSidebarData();
  }, [location.pathname, session]);

  const handleArchive = async (id) => {
    setRecentChats((prev) => prev.filter((chat) => chat.id !== id));
    try {
      await archiveConversation(id);
    } catch (error) {
      console.error("Failed to archive:", error);
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
    // THE FIX: We wrap EVERYTHING in a relative container so the dropdown can float outside the aside
    <div className="relative h-full z-30" ref={dropdownRef}>
      {/* THE DROPDOWN MENU - Now completely immune to overflow-hidden! */}
      {isDropdownOpen && session && (
        <div
          className={`absolute bottom-16 left-0 mb-2 bg-card border border-border-main rounded-xl shadow-lg overflow-hidden z-50 transition-all ${sidebarOpen ? "w-[calc(100%-16px)] mx-2" : "w-48 ml-2"}`}
        >
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

      {/* THE ACTUAL SIDEBAR */}
      <aside
        className={`h-full ${sidebarOpen ? "w-72" : "w-12"} border-r border-sidebar-border bg-card flex flex-col transition-[width] duration-300 ease-in-out shrink-0 overflow-hidden`}
      >
        <div className="pt-3 flex flex-col h-full">
          <div
            className={`flex items-center mb-6 transition-all duration-300 ${sidebarOpen ? "justify-between px-4" : "justify-center"}`}
          >
            <div
              className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${sidebarOpen ? "w-32 opacity-100" : "w-0 opacity-0"}`}
            >
              <span className="font-medium font-serif text-[22px] tracking-tight text-card-text-hover">
                Lumina
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 hover:bg-card-hover rounded-md transition-colors shrink-0"
            >
              <LayoutGrid
                size={18}
                className="text-card-text hover:text-card-text-hover transition-colors"
              />
            </button>
          </div>

          <div className="space-y-1 px-1">
            <SidebarItem
              icon={<Plus size={20} />}
              label="New chat"
              isOpen={sidebarOpen}
              to="/new"
              isActive={location.pathname === "/new"}
            />
            <SidebarItem
              icon={<Search size={20} />}
              label="Search"
              isOpen={sidebarOpen}
              to="#"
              isActive={false}
            />
          </div>

          <div
            className={`mt-8 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-1 transition-all duration-300 ease-in-out ${sidebarOpen ? "opacity-100" : "opacity-0 invisible pointer-events-none"}`}
          >
            <div className="w-[280px]">
              {" "}
              <p className="text-[11px] font-extralight text-placeholder tracking-wider px-3 mb-2 uppercase">
                Recents
              </p>
              <div className="space-y-1">
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
              </div>
            </div>
          </div>

          {/* BOTTOM PROFILE SECTION */}
          <div className="mt-auto relative w-full">
            {session ? (
              // LOGGED IN STATE
              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`w-full flex items-center cursor-pointer transition-colors group py-4 hover:bg-card-hover ${
                  sidebarOpen
                    ? "border-t border-sidebar-border px-4 justify-start"
                    : "border-t border-transparent px-0 justify-center"
                }`}
              >
                <div className="w-8 h-8 bg-[#2c2a27] dark:bg-[#c2c0b6] text-white dark:text-[#1a1918] rounded-full flex items-center justify-center text-[14px] font-normal shrink-0 leading-none pt-[1px]">
                  {getInitials(displayName)}
                </div>
                <div
                  className={`flex flex-col overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${sidebarOpen ? "w-40 ml-3 opacity-100" : "w-0 ml-0 opacity-0"}`}
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
              // LOGGED OUT STATE
              <div
                onClick={onOpenAuth}
                className={`w-full flex items-center cursor-pointer transition-colors group py-4 hover:bg-card-hover ${
                  sidebarOpen
                    ? "border-t border-sidebar-border px-4 justify-start"
                    : "border-t border-transparent px-0 justify-center"
                }`}
              >
                <LogIn
                  size={20}
                  className="shrink-0 text-accent group-hover:text-accent/80 transition-colors"
                />
                <span
                  className={`text-sm font-medium text-accent overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${sidebarOpen ? "w-32 ml-3 opacity-100" : "w-0 ml-0 opacity-0"}`}
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
