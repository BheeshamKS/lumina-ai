import { useState, useEffect } from "react"; // Add these
import {
  Plus,
  Search,
  LayoutGrid,
  Settings,
  Trash2,
  MessageSquare,
} from "lucide-react"; // Added MessageSquare icon
import { Link, useLocation } from "react-router-dom";
import { getConversations, archiveConversation } from "../utils/chatHistory"; // Add this

const SidebarItem = ({ icon, label, isOpen, to, isActive }) => (
  <Link
    to={to || "#"}
    className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} py-2.5 hover:bg-card-hover rounded-xl cursor-pointer text-card-text hover:text-card-text-hover transition-colors`}
  >
    <div className="shrink-0">{icon}</div>
    {isOpen && <span className="text-sm font-medium ml-3">{label}</span>}
  </Link>
);

const RecentItem = ({ id, title, currentChatId, onArchive }) => {
  const handleDelete = async (e) => {
    e.preventDefault(); // Stop navigation
    e.stopPropagation(); // Stop event bubbling
    onArchive(id); // Trigger the instant disappearance
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
        <MessageSquare size={14} className="shrink-0 opacity-70" />
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

export const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const currentChatId = location.pathname.split("/chat/")[1];
  const [recentChats, setRecentChats] = useState([]);

  const fetchChats = async () => {
    const chats = await getConversations();
    setRecentChats(chats);
  };

  useEffect(() => {
    fetchChats();
  }, [location.pathname]);

  // THE FIX: Optimistic Archive
  const handleArchive = async (id) => {
    // 1. INSTANTLY remove from UI
    setRecentChats((prev) => prev.filter((chat) => chat.id !== id));

    try {
      // 2. Do the slow DB work in background
      await archiveConversation(id);
    } catch (error) {
      console.error("Failed to archive:", error);
      // 3. If DB fails, bring it back
      fetchChats();
    }
  };

  return (
    <aside
      className={`${sidebarOpen ? "w-72" : "w-12"} border-r border-sidebar-border bg-card flex flex-col transition-all duration-300 shrink-0 overflow-hidden z-20`}
    >
      <div className="py-3 flex flex-col h-full">
        <div
          className={`flex items-center mb-6 ${sidebarOpen ? "justify-between px-4" : "justify-center"}`}
        >
          {sidebarOpen && (
            <span className="font-medium font-serif text-[22px] tracking-tight text-card-text-hover">
              Lumina
            </span>
          )}
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
          <SidebarItem
            icon={<Settings size={20} />}
            label="Settings"
            isOpen={sidebarOpen}
            to="/settings"
            isActive={location.pathname === "/settings"}
          />
        </div>

        {sidebarOpen && (
          <div className="mt-8 flex-1 overflow-y-auto no-scrollbar px-1">
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
                  onArchive={handleArchive} // Corrected prop name
                />
              ))}
              {recentChats.length === 0 && (
                <p className="px-3 py-2 text-[12px] text-placeholder italic">
                  No recent chats
                </p>
              )}
            </div>
          </div>
        )}

        <div
          className={`mt-auto pt-3 ${sidebarOpen ? "border-t border-sidebar-border w-full" : "border-t border-transparent w-full"} `}
        >
          <div
            className={`flex ${sidebarOpen ? "px-3" : "px-1 justify-center"}`}
          >
            <div
              className={`flex items-center ${sidebarOpen ? "justify-start px-2 py w-full" : "justify-center px-1 py-0.5"} rounded-xl cursor-pointer transition-colors group`}
            >
              <div className="w-8 h-8 bg-[#2c2a27] dark:bg-[#e6e4dfa7] text-white dark:text-[#1a1918] rounded-full flex items-center justify-center text-[16px] font-semibold shrink-0">
                BK
              </div>
              {sidebarOpen && (
                <div className="flex flex-col ml-3 overflow-hidden">
                  <span className="text-sm font-semibold text-card-text truncate group-hover:text-card-text-hover transition-colors">
                    Bheesham Kumar
                  </span>
                  <span className="text-[10px] text-placeholder group-hover:text-card-text-hover transition-colors">
                    Free plan
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
