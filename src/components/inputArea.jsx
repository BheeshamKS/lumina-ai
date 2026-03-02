import {
  Zap,
  Plus,
  ChevronDown,
  ArrowRight,
  PenLine,
  GraduationCap,
  Code2,
  Coffee,
} from "lucide-react"; // Ensure correct imports

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
}) => {
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
            <Zap
              size={42}
              className="text-accent fill-accent/20 mx-auto mb-4"
            />
            <h1
              className="text-4xl md:text-[40px] font-normal text-card-text tracking-tight"
              style={{ fontFamily: "Copernicus, Georgia, serif" }}
            >
              {greeting}, Bheesham
            </h1>
          </div>
        )}

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
            className={`w-full bg-transparent resize-none outline-none px-2 pt-2 text-[16px] font-sans leading-normal text-outputmassage placeholder-placeholder max-h-100 ${messagesLength === 0 ? "min-h-15" : "min-h-10"}`}
          />

          <div className="flex justify-between items-center mt-1 pt px-1">
            <button className="p-2 hover:bg-card-hover rounded-full text-card-text hover:text-card-text-hover transition-colors">
              <Plus size={20} />
            </button>
            <div className="flex items-center gap-3 text-card-text text-xs font-medium">
              <div className="flex items-center gap-1 cursor-pointer hover:text-card-text-hover transition-colors">
                <span>Lumina 1.0</span>
                <ChevronDown size={14} />
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
                  <Zap size={16} className="fill-accent/10" />
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
