import { useState, useEffect, useRef } from "react";
import {
  Plus, Search, X, Settings, Trash2, MoreHorizontal,
  Pencil, LogIn, LogOut, PanelLeft, MessageSquare,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";
import {
  getConversations, archiveConversation, searchConversations, updateConversationTitle,
} from "../utils/chatHistory";
import type { Conversation } from "../types";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  isOpen: boolean;
  to?: string;
  onClick?: (e?: React.MouseEvent) => void;
}

const SidebarItem = ({ icon, label, isOpen, to, onClick }: SidebarItemProps) => (
  <Link
    to={to || "#"}
    onClick={onClick}
    className="flex items-center w-full py-2.5 rounded-xl text-card-text hover:bg-card-hover hover:text-card-text-hover transition-colors"
  >
    <div className="w-12 shrink-0 flex items-center justify-center">{icon}</div>
    <span
      style={{
        opacity: isOpen ? 1 : 0,
        width: isOpen ? "10rem" : "0px",
        overflow: "hidden",
        whiteSpace: "nowrap",
        transition: "opacity 300ms cubic-bezier(0.4,0,0.2,1), width 300ms cubic-bezier(0.4,0,0.2,1)",
      }}
      className="text-sm font-medium"
    >
      {label}
    </span>
  </Link>
);

interface RecentItemProps {
  id: string;
  title: string;
  currentChatId: string | undefined;
  onArchive: (id: string) => void;
  onClick?: () => void;
}

const RecentItem = ({ id, title, currentChatId, onArchive, onClick }: RecentItemProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(title);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => setMenuOpen(true), 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  useEffect(() => {
    if (!menuOpen) return;

    const close = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpen(false);
      }
    };

    document.addEventListener("touchstart", close as EventListener, { capture: true, passive: false });
    document.addEventListener("mousedown", close as EventListener, { capture: true });

    return () => {
      document.removeEventListener("touchstart", close as EventListener, { capture: true });
      document.removeEventListener("mousedown", close as EventListener, { capture: true });
    };
  }, [menuOpen]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    onArchive(id);
  };

  const handleRenameSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!renameValue.trim()) return;
    setIsRenaming(false);
    await updateConversationTitle(id, renameValue.trim());
  };

  if (isRenaming) {
    return (
      <form onSubmit={handleRenameSubmit} className="flex items-center gap-1 px-3 py-1.5">
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => e.key === "Escape" && setIsRenaming(false)}
          className="flex-1 text-sm bg-card-hover text-card-text rounded-md px-2 py-1 outline-none border border-sidebar-border"
        />
      </form>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <Link
        to={`/chat/${id}`}
        onClick={(e) => {
          if (menuOpen) { e.preventDefault(); setMenuOpen(false); return; }
          onClick?.();
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
        className={`select-none group flex items-center justify-between px-2 py-1 text-sm rounded-lg transition-all duration-200 ${
          currentChatId === id
            ? "bg-card-hover text-card-text-hover font-medium"
            : "text-card-text hover:bg-card-hover"
        }`}
      >
        <span className="truncate pr-0 flex-1">{renameValue}</span>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="hidden md:block opacity-0 group-hover:opacity-100 p-1.5 hover:bg-card-hover rounded-md transition-all shrink-0"
        >
          <MoreHorizontal size={14} />
        </button>
      </Link>

      {menuOpen && (
        <div className="absolute right-0 top-8 w-40 bg-bgDropDown border border-bgDropDownBorder rounded-xl shadow-lg overflow-hidden z-60">
          <button
            onClick={(e) => { e.preventDefault(); setMenuOpen(false); setIsRenaming(true); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-card-text hover:bg-card-hover transition-colors"
          >
            <Pencil size={14} /> Rename
          </button>
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#FE8181] hover:bg-[#FE8181]/10 transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchModal = ({ isOpen, onClose }: SearchModalProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) { setQuery(""); setResults([]); return; }

    let isMounted = true;
    setLoading(true);

    const fetchResults = async () => {
      try {
        const data = await searchConversations(query);
        if (isMounted) setResults(data || []);
      } catch (err) {
        console.error("Search UI error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => { fetchResults(); }, 300);
    return () => { isMounted = false; clearTimeout(delayDebounceFn); };
  }, [query, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 bg-transparent flex items-start justify-center py-50 px-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border-hover rounded-xl w-full max-w-2xl flex flex-col h-[50vh] min-h-[300px] max-h-[600px] overflow-hidden animate-in slide-in-from-top-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-main bg-inputcard">
          <Search size={18} className="text-placeholder shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your chats..."
            className="flex-1 bg-transparent outline-none text-[15px] text-card-text placeholder-placeholder min-w-0"
          />
          <button onClick={onClose} className="p-1 rounded-lg text-placeholder hover:bg-card-hover hover:text-card-text transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 no-scrollbar bg-app">
          {loading ? (
            <div className="py-8 text-center text-[13px] text-placeholder animate-pulse">Searching...</div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-placeholder">No chats found.</div>
          ) : (
            <div className="space-y-1">
              {results.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => { navigate(`/chat/${chat.id}`); onClose(); }}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-card-hover transition-colors text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <MessageSquare size={16} className="text-placeholder shrink-0" />
                    <span className="text-[14px] text-card-text font-medium truncate">{chat.title}</span>
                  </div>
                  <span className="text-[11px] font-medium text-placeholder opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
                    Open ↵
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  session: Session | null;
  onOpenAuth: () => void;
}

export const Sidebar = ({ sidebarOpen, setSidebarOpen, session, onOpenAuth }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentChatId = location.pathname.split("/chat/")[1];

  const CHATS_PER_PAGE = 15;

  const [recentChats, setRecentChats] = useState<Conversation[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dragX, setDragX] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
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
        const fullName =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email?.split("@")[0] ||
          "User";
        setDisplayName(fullName);
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

  const handleArchive = async (id: string) => {
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

  const handleMobileClose = () => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleProfileClick = () => {
    if (window.innerWidth < 768) { setSidebarOpen(false); navigate("/settings"); }
    else setIsDropdownOpen(!isDropdownOpen);
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const mobileDrawerStyle: React.CSSProperties = {
    position: "fixed", top: 0, left: 0, bottom: 0, width: "280px", zIndex: 50,
    transform: sidebarOpen ? `translateX(-${dragX}px)` : "translateX(-100%)",
    transition: dragX > 0 ? "none" : "transform 300ms cubic-bezier(0.4,0,0.2,1)",
  };

  const desktopWrapperStyle: React.CSSProperties = {
    width: sidebarOpen ? "288px" : "48px",
    transition: "width 300ms cubic-bezier(0.4,0,0.2,1)",
    flexShrink: 0, position: "relative", height: "100%", overflow: "visible", zIndex: 30,
  };

  const handleSidebarTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleSidebarTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.touches[0].clientX;
    if (diff > 0) setDragX(diff);
  };

  const handleSidebarTouchEnd = () => {
    if (dragX > 50) setSidebarOpen(false);
    setDragX(0);
    touchStartX.current = null;
  };

  return (
    <>
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {!isMobile && (
        <div style={desktopWrapperStyle} className="bg-card border-r border-sidebar-border">
          <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

          {isDropdownOpen && session && (
            <div
              ref={dropdownRef}
              className="absolute bottom-16 left-2 w-[260px] mb-2 bg-bgDropDown border border-bgDropDownBorder rounded-xl shadow-lg overflow-hidden z-50 hidden md:block"
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

          <div style={{ overflow: "hidden", height: "100%" }}>
            <aside className="w-72 h-full flex flex-col">
              <DesktopSidebarContent
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                setIsSearchOpen={setIsSearchOpen}
                session={session}
                onOpenAuth={onOpenAuth}
                recentChats={recentChats}
                currentChatId={currentChatId}
                isDropdownOpen={isDropdownOpen}
                setIsDropdownOpen={setIsDropdownOpen}
                displayName={displayName}
                isLoadingMore={isLoadingMore}
                loadMoreChats={loadMoreChats}
                handleArchive={handleArchive}
                getInitials={getInitials}
              />
            </aside>
          </div>
        </div>
      )}

      {isMobile && (
        <aside
          style={mobileDrawerStyle}
          className="bg-card border-r border-sidebar-border flex flex-col"
          onTouchStart={handleSidebarTouchStart}
          onTouchMove={handleSidebarTouchMove}
          onTouchEnd={handleSidebarTouchEnd}
        >
          <div className="pt-3 flex flex-col h-full">
            <div className="flex items-center justify-between px-4 mb-6">
              <span className="font-medium font-serif text-[22px] tracking-tight text-card-text-hover">Lumina</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-card-hover rounded-md transition-colors">
                <X size={20} className="text-card-text" />
              </button>
            </div>

            <div className="space-y-0.5 px-2">
              <SidebarItem icon={<Plus size={20} />} label="New chat" isOpen={true} to="/new" onClick={handleMobileClose} />
            </div>

            <div
              className="mt-8 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-2"
              onScroll={(e) => {
                const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                if (scrollHeight - scrollTop <= clientHeight + 20) loadMoreChats();
              }}
            >
              <p className="text-[11px] font-extralight text-placeholder tracking-wider px-1 mb-2 uppercase">Recents</p>
              <div className="space-y-0.5">
                {recentChats.map((chat) => (
                  <RecentItem
                    key={chat.id}
                    id={chat.id}
                    title={chat.title}
                    currentChatId={currentChatId}
                    onArchive={handleArchive}
                    onClick={handleMobileClose}
                  />
                ))}
                {recentChats.length === 0 && (
                  <p className="px-3 py-2 text-[12px] text-placeholder italic">No recent chats</p>
                )}
                {isLoadingMore && (
                  <div className="flex justify-center py-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-sidebar-ring" />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto w-full">
              {session ? (
                <div
                  onClick={handleProfileClick}
                  className="w-full flex items-center cursor-pointer group py-4 px-4 border-t border-sidebar-border hover:bg-card-hover transition-colors gap-3"
                >
                  <div className="w-8 h-8 bg-[#2c2a27] dark:bg-[#c2c0b6] text-white dark:text-[#1a1918] rounded-full flex items-center justify-center text-[14px] font-normal shrink-0">
                    {getInitials(displayName)}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-semibold text-card-text truncate">{displayName}</span>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => { handleMobileClose(); onOpenAuth(); }}
                  className="w-full flex items-center cursor-pointer group py-4 px-4 border-t border-sidebar-border hover:bg-card-hover transition-colors gap-3"
                >
                  <LogIn size={20} className="text-accent shrink-0" />
                  <span className="text-sm font-medium text-accent">Sign in or Sign up</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      )}
    </>
  );
};

interface DesktopSidebarContentProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setIsSearchOpen: (open: boolean) => void;
  session: Session | null;
  onOpenAuth: () => void;
  recentChats: Conversation[];
  currentChatId: string | undefined;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (open: boolean) => void;
  displayName: string;
  isLoadingMore: boolean;
  loadMoreChats: () => void;
  handleArchive: (id: string) => void;
  getInitials: (name: string) => string;
}

const DesktopSidebarContent = ({
  sidebarOpen, setSidebarOpen, setIsSearchOpen, session, onOpenAuth,
  recentChats, currentChatId, isDropdownOpen, setIsDropdownOpen,
  displayName, isLoadingMore, loadMoreChats, handleArchive, getInitials,
}: DesktopSidebarContentProps) => (
  <div className="pt-3 flex flex-col h-full">
    <div className="flex items-center mb-6">
      <div className="w-12 shrink-0 flex items-center justify-center">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 hover:bg-card-hover rounded-md transition-colors"
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <PanelLeft
            size={18}
            className="text-card-text hover:text-card-text-hover transition-colors"
            style={{ transform: sidebarOpen ? "scaleX(1)" : "scaleX(-1)", transition: "transform 300ms cubic-bezier(0.4,0,0.2,1)" }}
          />
        </button>
      </div>
      <div style={{ overflow: "hidden", whiteSpace: "nowrap", opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? "12rem" : "0px", transition: "opacity 300ms cubic-bezier(0.4,0,0.2,1), width 300ms cubic-bezier(0.4,0,0.2,1)" }}>
        <span className="font-medium font-serif text-[22px] tracking-tight text-card-text-hover">Lumina</span>
      </div>
    </div>

    <div className="space-y-0.5">
      <SidebarItem icon={<Plus size={20} />} label="New chat" isOpen={sidebarOpen} to="/new" />
      <SidebarItem
        icon={<Search size={20} />}
        label="Search"
        isOpen={sidebarOpen}
        to="#"
        onClick={(e) => { e?.preventDefault(); setIsSearchOpen(true); }}
      />
    </div>

    <div
      className="mt-8 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-2"
      style={{ opacity: sidebarOpen ? 1 : 0, visibility: sidebarOpen ? "visible" : "hidden", pointerEvents: sidebarOpen ? "auto" : "none", transition: "opacity 300ms cubic-bezier(0.4,0,0.2,1)" }}
      onScroll={(e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 20) loadMoreChats();
      }}
    >
      <p className="text-[11px] font-extralight text-placeholder tracking-wider px-1 mb-2 uppercase">Recents</p>
      <div className="space-y-0.5">
        {recentChats.map((chat) => (
          <RecentItem key={chat.id} id={chat.id} title={chat.title} currentChatId={currentChatId} onArchive={handleArchive} />
        ))}
        {recentChats.length === 0 && (
          <p className="px-3 py-2 text-[12px] text-placeholder italic">No recent chats</p>
        )}
        {isLoadingMore && (
          <div className="flex justify-center py-3">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-sidebar-ring" />
          </div>
        )}
      </div>
    </div>

    <div className="mt-auto w-full">
      {session ? (
        <div
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`w-full flex items-center cursor-pointer group py-4 px-0 transition-colors hover:bg-card-hover ${sidebarOpen ? "border-t border-sidebar-border" : "border-t border-transparent"}`}
        >
          <div className="w-12 shrink-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-[#2c2a27] dark:bg-[#c2c0b6] text-white dark:text-[#1a1918] rounded-full flex items-center justify-center text-[14px] font-normal leading-none pt-[1px]">
              {getInitials(displayName)}
            </div>
          </div>
          <span className="text-sm font-semibold text-card-text truncate group-hover:text-card-text-hover transition-colors">{displayName}</span>
        </div>
      ) : (
        <div
          onClick={onOpenAuth}
          className="w-full flex items-center cursor-pointer group py-4 border-t border-sidebar-border hover:bg-card-hover transition-colors"
        >
          <div className="w-12 shrink-0 flex items-center justify-center">
            <LogIn size={20} className="text-accent group-hover:text-accent/80 transition-colors" />
          </div>
          <span
            style={{ overflow: "hidden", whiteSpace: "nowrap", opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? "9rem" : "0px", transition: "opacity 300ms cubic-bezier(0.4,0,0.2,1), width 300ms cubic-bezier(0.4,0,0.2,1)" }}
            className="text-sm font-medium text-accent"
          >
            Sign in or Sign up
          </span>
        </div>
      )}
    </div>
  </div>
);
