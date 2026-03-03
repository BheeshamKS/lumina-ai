import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { getLuminaTheme } from "../utils/syntaxTheme";

export const CodeBlock = ({ children, className, darkMode }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (match || String(children).includes("\n")) {
    return (
      <div className="my-4 rounded-[8px] overflow-hidden bg-codeblock-bg border border-codeblockborder font-sans group">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <span className="text-[12px] text-placeholder font-medium lowercase">
            {match ? match[1] : "code"}
          </span>
          <button
            onClick={handleCopy}
            className="text-placeholder hover:text-[#e6e4df] transition-colors opacity-0 group-hover:opacity-100 text-[12px]"
          >
            {copied ? "copied!" : "copy"}
          </button>
        </div>
        <div className="px-4 pb-4 overflow-x-auto font-mono">
          <SyntaxHighlighter
            style={getLuminaTheme(darkMode)}
            language={match ? match[1] : "text"}
            PreTag="div"
            customStyle={{
              background: "transparent",
              padding: 0,
              margin: 0,
              fontSize: "14px",
              lineHeight: "1.6",
              fontFamily: "'Roboto Mono', ui-monospace, monospace",
            }}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  }

  return (
    <code
      className="bg-inlinebg text-inlinetext px-[5px] py-[2px] rounded-[6px] text-[13px] border border-inlineborder"
      style={{ fontFamily: "'Roboto Mono', ui-monospace, monospace" }}
    >
      {children}
    </code>
  );
};
