import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  MessageSquare,
  LayoutGrid,
  Code2,
  PenLine,
  GraduationCap,
  Coffee,
  Download,
  Zap,
  Moon,
  Sun,
  Ghost,
  ChevronDown,
} from "lucide-react";

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const textAreaRef = useRef(null);

  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour >= 5 && hour < 12) greeting = "Good morning";
  else if (hour >= 12 && hour < 18) greeting = "Good afternoon";

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto";
      textAreaRef.current.style.height =
        textAreaRef.current.scrollHeight + "px";
    }
  }, [input]);

  return (
    <div className="flex h-screen bg-app font-sans">
      {/* 1. SIDEBAR */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-17"
        } border-r border-border-main bg-card flex flex-col transition-all duration-300 shrink-0 overflow-hidden`}
      >
        <div className="py-3 flex flex-col h-full">
          <div
            className={`flex items-center mb-6 ${sidebarOpen ? "justify-between px-4" : "justify-center"}`}
          >
            {sidebarOpen && (
              <span className="font-medium font-serif text-[22px] tracking-tight text-primary">
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

          <div className="space-y-1 px-3">
            <SidebarItem
              icon={<Plus size={20} />}
              label="New chat"
              isOpen={sidebarOpen}
            />
            <SidebarItem
              icon={<Search size={20} />}
              label="Search"
              isOpen={sidebarOpen}
            />
          </div>

          {sidebarOpen && (
            <div className="mt-8 flex-1 overflow-hidden px-3">
              <p className="text-[11px] font-bold text-card-text uppercase tracking-widest px-2 mb-2">
                Recents
              </p>
              <div className="space-y-1">
                <RecentItem title="Lumina UI Skeleton" />
                <RecentItem title="Cool Blue Theme Logic" />
              </div>
            </div>
          )}

          {/* Profile Section */}
          <div className="mt-auto pt-3 border-t border-border-main w-full">
            <div className="px-3">
              <div
                className={`flex items-center ${sidebarOpen ? "justify-start px-2" : "justify-center"} py-2 hover:bg-card-hover rounded-xl cursor-pointer transition-colors group`}
              >
                <div className="w-8 h-8 bg-[#2c2a27] dark:bg-[#e6e4df] text-white dark:text-[#1a1918] rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 shadow-sm">
                  BK
                </div>
                {sidebarOpen && (
                  <div className="flex flex-col ml-3 overflow-hidden">
                    <span className="text-sm font-semibold text-primary truncate group-hover:text-card-text-hover transition-colors">
                      Bheesham Kumar
                    </span>
                    <span className="text-[10px] text-card-text group-hover:text-card-text-hover transition-colors">
                      Free plan
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. MAIN AREA */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative bg-app overflow-y-auto">
        {/* Top Controls */}
        <div className="absolute top-6 right-6 flex items-center gap-3">
          <div className="px-3 py-1 bg-card border border-border-main rounded-full text-[12px] text-card-text flex gap-2 shadow-sm">
            <span>Free plan</span>
            <span className="opacity-30">|</span>
            <button className="hover:text-accent transition-colors">
              Upgrade
            </button>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 hover:bg-card-hover rounded-full transition-all text-card-text hover:text-card-text-hover"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* Center Content */}
        <div className="w-full max-w-2xl flex flex-col items-center">
          <div className="mb-10 text-center">
            <Zap
              size={42}
              className="text-accent fill-accent/20 mx-auto mb-4"
            />
            <h1 className="text-4xl md:text-[40px] font-serif text-primary tracking-tight">
              {greeting}, Bheesham
            </h1>
          </div>

          {/* Floating Input Box */}
          <div className="w-full px-4">
            <div
              className="
            relative bg-inputcard rounded-[28px] p-3 
            border border-border-main 
            hover:border-border-hover 
            focus-within:border-border-hover 
            focus-within:shadow-[0_0_40px_-10px_rgba(0,0,0,0.05)]
            dark:focus-within:shadow-[0_0_40px_-10px_rgba(0,0,0,0.2)] 
            transition-all duration-200
          "
            >
              <textarea
                ref={textAreaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="How can Lumina help you today?"
                rows="1"
                className="w-full bg-transparent resize-none outline-none px-2 pt-2 text-[17px] leading-relaxed text-primary placeholder-placeholder min-h-11 max-h-100"
              />

              <div className="flex justify-between items-center mt-1 pt-2 px-1">
                <button className="p-2 hover:bg-card-hover rounded-full text-card-text hover:text-card-text-hover transition-colors">
                  <Plus size={20} />
                </button>

                <div className="flex items-center gap-3 text-card-text text-xs font-medium">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-card-text-hover transition-colors">
                    <span>Lumina 1.0</span>
                    <ChevronDown size={14} />
                  </div>
                  <div className="w-px h-3 bg-border-main" />
                  <button className="p-1.5 bg-app hover:bg-card-hover rounded-lg text-accent transition-colors">
                    <Zap size={16} className="fill-accent/10" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Suggestion Chips */}
          <div className="flex flex-wrap justify-center gap-2.5 mt-8">
            <Chip icon={<PenLine size={16} />} label="Write" />
            <Chip icon={<GraduationCap size={16} />} label="Learn" />
            <Chip icon={<Code2 size={16} />} label="Code" />
            <Chip icon={<Coffee size={16} />} label="Life stuff" />
          </div>
        </div>
      </main>
    </div>
  );
}

// Sub-components
const SidebarItem = ({ icon, label, isOpen }) => (
  <div
    className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} py-2.5 hover:bg-card-hover rounded-xl cursor-pointer text-card-text hover:text-card-text-hover transition-colors`}
  >
    <div className="shrink-0">{icon}</div>
    {isOpen && <span className="text-sm font-medium ml-3">{label}</span>}
  </div>
);

const RecentItem = ({ title }) => (
  <div className="px-3 py-2 text-sm text-card-text hover:bg-card-hover rounded-lg cursor-pointer truncate hover:text-card-text-hover transition-colors">
    {title}
  </div>
);

// Global Chip Button logic
const Chip = ({ icon, label }) => (
  <button className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-card-hover border border-border-main hover:border-card-hover rounded-[10px] text-sm font-medium text-card-text hover:text-card-text-hover transition-all">
    <span className="shrink-0">{icon}</span>
    {label}
  </button>
);
export default App;
