import { useState, useRef, useEffect } from "react";
import { Logo } from "./logo";
import {
  Plus,
  ChevronDown,
  ArrowRight,
  PenLine,
  GraduationCap,
  Code2,
  Coffee,
  Check,
} from "lucide-react";

const Chip = ({ icon, label }) => (
  <button className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-card-hover border border-border-main hover:border-card-hover rounded-[10px] text-sm font-medium text-card-text hover:text-card-text-hover transition-all">
    <span className="shrink-0">{icon}</span>
    {label}
  </button>
);

export const InputArea = ({
  input,
  setInput,
  handleSend,
  handleKeyDown,
  textAreaRef,
  messagesLength,
  greeting,
  activeModel,
  setActiveModel,
  availableModels = [],
  session, // ── FEATURE 4: needed to show guest footer
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Group models by provider for the dropdown
  const groupedModels = availableModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = { provider: model.provider, models: [] };
    }
    acc[model.provider].models.push(model);
    return acc;
  }, {});

  const availableProviders = Object.values(groupedModels);

  // ── FEATURE 4: Show the guest upsell footer if user has no session
  const isGuest = !session;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectModel = (model, provider) => {
    setActiveModel({ ...model, provider });
    setIsMenuOpen(false);
  };

  return (
    <div
      className={
        messagesLength === 0
          ? "w-full max-w-176.75 flex-1 flex flex-col justify-center px-4"
          : "w-full max-w-197.5 absolute bottom-0 left-1/2 -translate-x-1/2 px-4 pb-6 pt-4 bg-gradient-to-t from-app via-app to-transparent"
      }
    >
      <div className="relative w-full">
        {messagesLength === 0 && (
          <div className="absolute bottom-full left-0 w-full mb-10 text-center">
            <Logo className="w-11 h-11 mx-auto mb-4" />
            <h1
              className="text-4xl md:text-[40px] font-normal text-card-text tracking-tight"
              style={{ fontFamily: "Copernicus, Georgia, serif" }}
            >
              {greeting}, Bheesham
            </h1>
          </div>
        )}

        {/* INPUT BOX */}
        <div className="relative bg-inputcard rounded-[22px] px-3 py-2 border border-border-main hover:border-border-hover focus-within:border-border-hover focus-within:shadow-[0_0_40px_-10px_rgba(0,0,0,0.05)] dark:focus-within:shadow-[0_0_40px_-10px_rgba(0,0,0,0.2)] transition-all duration-200 shadow-sm z-10">
          <textarea
            ref={textAreaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              messagesLength === 0 ? "How can I help you today?" : "Reply..."
            }
            rows="1"
            className={`w-full bg-transparent resize-none outline-none px-2 pt-2 text-[16px] font-sans leading-normal text-outputmassage placeholder-placeholder max-h-100 ${messagesLength === 0 ? "min-h-15" : "min-h-6"}`}
          />

          <div className="flex justify-between items-center mt-1 pt px-1">
            <button className="p-2 hover:bg-card-hover rounded-full text-card-text hover:text-card-text-hover transition-colors">
              <Plus size={20} />
            </button>

            <div className="flex items-center gap-3 text-card-text text-xs font-medium">
              {/* MODEL SELECTOR */}
              <div className="relative" ref={menuRef}>
                <div
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-1.5 cursor-pointer hover:text-card-text-hover transition-colors px-2 py-1 rounded-md hover:bg-card-hover"
                >
                  <span className="truncate max-w-[120px]">
                    {activeModel?.name || "Loading..."}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${isMenuOpen ? "rotate-180" : ""}`}
                  />
                </div>

                {/* FLOATING DROPDOWN */}
                {isMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-64 bg-card border border-border-main rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    {/* Model list */}
                    <div className="max-h-80 overflow-y-auto p-1.5 space-y-2 no-scrollbar">
                      {availableProviders.length > 0 ? (
                        availableProviders.map((group) => (
                          <div key={group.provider}>
                            <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-placeholder">
                              {group.provider}
                            </div>
                            {group.models.map((model) => (
                              <button
                                key={model.id}
                                onClick={() =>
                                  selectModel(model, group.provider)
                                }
                                className="w-full flex items-center justify-between px-2.5 py-2 text-[13px] text-card-text hover:bg-card-hover hover:text-card-text-hover rounded-lg transition-colors text-left"
                              >
                                <div className="flex flex-col">
                                  <span className="truncate">{model.name}</span>
                                  {model.type && (
                                    <span className="text-[10px] text-placeholder mt-0.5">
                                      {model.type}
                                    </span>
                                  )}
                                </div>
                                {activeModel?.id === model.id && (
                                  <Check
                                    size={14}
                                    className="text-accent shrink-0 ml-2"
                                  />
                                )}
                              </button>
                            ))}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-center">
                          <p className="text-[12px] text-placeholder mb-2">
                            No API keys configured.
                          </p>
                          <button className="text-[12px] text-accent hover:underline">
                            Open Settings
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ── FEATURE 4: Guest upsell footer ── */}
                    {isGuest && (
                      <div className="border-t border-border-main px-3 py-2.5 bg-card">
                        <p className="text-[11px] text-placeholder leading-relaxed">
                          Sign up and add your own API keys in{" "}
                          <span className="text-accent font-medium">
                            Settings
                          </span>{" "}
                          to unlock more models.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="w-px h-3 bg-border-main" />

              {input.trim() ? (
                <button
                  onClick={handleSend}
                  className="p-1.5 bg-accent rounded-lg text-white hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button className="p-1.5 bg-app hover:bg-card-hover rounded-lg text-accent transition-colors">
                  <Logo size={16} className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {messagesLength > 0 && (
          <div className="text-center mt-2 text-[11px] text-placeholder tracking-wide">
            Lumina is AI and can make mistakes. Please double-check responses.
          </div>
        )}

        {messagesLength === 0 && input.trim() === "" && (
          <div className="absolute top-full left-0 w-full flex flex-wrap justify-center gap-2.5 pt-8 animate-in fade-in duration-300">
            <Chip icon={<PenLine size={16} />} label="Write" />
            <Chip icon={<GraduationCap size={16} />} label="Learn" />
            <Chip icon={<Code2 size={16} />} label="Code" />
            <Chip icon={<Coffee size={16} />} label="Life stuff" />
          </div>
        )}
      </div>
    </div>
  );
};
