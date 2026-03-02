import { Plus, Search, LayoutGrid } from "lucide-react"; // Adjust if you use lucide-react differently

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

export const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
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
          />
          <SidebarItem
            icon={<Search size={20} />}
            label="Search"
            isOpen={sidebarOpen}
          />
        </div>

        {sidebarOpen && (
          <div className="mt-8 flex-1 overflow-hidden px-1">
            <p className="text-[11px] font-extralight text-placeholder tracking-wider px-3 mb-2">
              Recents
            </p>
            <div className="space-y-1">
              <RecentItem title="Lumina UI Skeleton" />
              <RecentItem title="Cool Blue Theme Logic" />
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
