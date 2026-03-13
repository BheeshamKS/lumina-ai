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
  Globe,
} from "lucide-react";
import { ToggleSwitch } from "./toggleSwitch";

const Chip = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-card hover:bg-card-hover border border-border-main hover:border-card-hover rounded-[10px] text-xs md:text-sm font-medium text-card-text hover:text-card-text-hover transition-all active:scale-95"
  >
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
  session,
  onOpenAuth,
  isWebSearchEnabled,
  setIsWebSearchEnabled,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);

  const menuRef = useRef(null);
  const plusMenuRef = useRef(null);

  const groupedModels = availableModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = { provider: model.provider, models: [] };
    }
    acc[model.provider].models.push(model);
    return acc;
  }, {});

  const availableProviders = Object.values(groupedModels);
  const isGuest = !session;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }

      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target)) {
        setIsPlusMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectModel = (model, provider) => {
    setActiveModel({ ...model, provider });
    setIsMenuOpen(false);
  };

  const chipPrompts = {
    Write: "Help me write ",
    Learn: "Explain to me how ",
    Code: "Write code to ",
    "Life stuff": "Help me think through ",
  };

  const handleChipClick = (label) => {
    setInput(chipPrompts[label] || "");
    textAreaRef?.current?.focus();
  };

  return (
    <div
      className={
        messagesLength === 0
          ? "w-full max-w-[740px] flex-1 flex flex-col justify-end md:justify-center px-4 md:px-8 mx-auto pb-8 md:pb-0"
          : "w-full max-w-[790px] absolute bottom-0 left-1/2 -translate-x-1/2 px-3 md:px-4 pb-4 md:pb-6 pt-4 bg-gradient-to-t from-app via-app to-transparent z-20"
      }
    >
      <div className="relative w-full">
        {/* Greeting — new chat only */}
        {messagesLength === 0 && (
          <div className="fixed md:absolute top-[40%] md:top-auto md:bottom-full left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 w-full mb-8 md:mb-10 text-center px-4 -translate-y-1/2 md:translate-y-0 pointer-events-none">
            <Logo className="w-9 h-9 md:w-11 md:h-11 mx-auto mb-3 md:mb-4" />
            <h1
              className="text-[25px] md:text-[40px] font-bold md:font-normal  text-card-text tracking-tight leading-tight"
              style={{ fontFamily: "Copernicus, Georgia, serif" }}
            >
              {greeting}
            </h1>
          </div>
        )}

        {/* INPUT BOX */}
        <div className="relative bg-inputcard rounded-[18px] md:rounded-[22px] px-3 py-2 border border-border-main hover:border-border-hover focus-within:border-border-hover focus-within:shadow-[0_0_40px_-10px_rgba(0,0,0,0.05)] dark:focus-within:shadow-[0_0_40px_-10px_rgba(0,0,0,0.2)] transition-all duration-200 shadow-sm z-10">
          <textarea
            ref={textAreaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              messagesLength === 0 ? "How can I help you today?" : "Reply..."
            }
            rows="1"
            className={`w-full bg-transparent resize-none outline-none px-2 pt-2 text-[15px] md:text-[16px] font-sans leading-normal text-outputmassage placeholder-placeholder max-h-100 
              ${messagesLength === 0 ? "min-h-10 md:min-h-15" : "min-h-10 md:min-h-10"}`}
          />

          <div className="flex justify-between items-center mt-1 px-1">
            <div className="relative" ref={plusMenuRef}>
              <button
                onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                className="p-2 hover:bg-card-hover rounded-full text-card-text hover:text-card-text-hover transition-colors"
              >
                <Plus
                  size={19}
                  className={`transition-transform duration-200 ${isPlusMenuOpen ? "rotate-45" : ""}`}
                />
              </button>

              {isPlusMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-bgDropDown border border-bgDropDownBorder rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="p-1.5">
                    <div
                      onClick={() => {
                        setIsWebSearchEnabled(!isWebSearchEnabled);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 text-[13px] text-card-text hover:bg-card-hover hover:text-card-text-hover rounded-lg transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Globe
                          size={15}
                          className={
                            isWebSearchEnabled
                              ? "text-toggleSwitch"
                              : "text-placeholder"
                          }
                        />
                        <span>Web Search</span>
                      </div>
                      <ToggleSwitch
                        isOn={isWebSearchEnabled}
                        onToggle={() =>
                          setIsWebSearchEnabled(!isWebSearchEnabled)
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 md:gap-3 text-card-text text-xs font-medium">
              {/* MODEL SELECTOR */}
              <div className="relative" ref={menuRef}>
                <div
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-1 cursor-pointer hover:text-card-text-hover transition-colors px-2 py-1 rounded-md hover:bg-card-hover"
                >
                  <span className="truncate max-w-[90px] md:max-w-[120px] text-[11px] md:text-[12px]">
                    {activeModel?.name || "Loading..."}
                  </span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 shrink-0 ${isMenuOpen ? "rotate-180" : ""}`}
                  />
                </div>

                {isMenuOpen && (
                  <div className="fixed bottom-20 right-3 left-3 sm:absolute sm:bottom-full sm:right-0 sm:left-auto sm:w-64 mb-2 bg-bgDropDown border border-bgDropDownBorder rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="max-h-72 overflow-y-auto p-1.5 space-y-2 no-scrollbar">
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
                                className="w-full flex items-center justify-between px-2.5 py-2 text-[12px] text-card-text hover:bg-card-hover hover:text-card-text-hover rounded-lg transition-colors text-left"
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
                                    className="text-toggleSwitch shrink-0 ml-2"
                                  />
                                )}
                              </button>
                            ))}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-center">
                          <p className="text-[11px] text-placeholder mb-2">
                            No API keys configured.
                          </p>
                          <button className="text-[11px] text-accent hover:underline">
                            Open Settings
                          </button>
                        </div>
                      )}
                    </div>

                    {isGuest && (
                      <div className="border-t border-bgDropDownBorder px-3 py-2.5 bg-bgDropDown">
                        <p className="text-[10px] text-placeholder leading-relaxed">
                          Sign up and add API keys in{" "}
                          <span
                            className="text-accent font-medium cursor-pointer hover:underline"
                            onClick={onOpenAuth}
                          >
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
                  <ArrowRight size={15} />
                </button>
              ) : (
                <button className="p-1.5 bg-app hover:bg-card-hover rounded-lg text-accent transition-colors">
                  <Logo size={15} className="w-[15px] h-[15px]" />
                </button>
              )}
            </div>
          </div>
        </div>

        {messagesLength > 0 && (
          <div className="text-center mt-2 text-[10px] md:text-[11px] text-placeholder tracking-wide">
            Lumina is AI and can make mistakes. Please double-check responses.
          </div>
        )}

        {messagesLength === 0 && input.trim() === "" && (
          <div className="hidden md:flex absolute top-full left-0 w-full flex-wrap justify-center gap-2 pt-6 md:pt-8 animate-in fade-in duration-300">
            {[
              { icon: <PenLine size={14} />, label: "Write" },
              { icon: <GraduationCap size={14} />, label: "Learn" },
              { icon: <Code2 size={14} />, label: "Code" },
              { icon: <Coffee size={14} />, label: "Life stuff" },
            ].map(({ icon, label }) => (
              <Chip
                key={label}
                icon={icon}
                label={label}
                onClick={() => handleChipClick(label)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
