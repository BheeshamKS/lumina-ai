export const Logo = ({ className = "w-10 h-10" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className} // Lets you pass Tailwind sizing/margins easily!
    >
      <defs>
        <linearGradient id="zapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d97757" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#d97757" stopOpacity="0.1" />
        </linearGradient>

        <linearGradient id="zapOutline" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d97757" />
          <stop offset="100%" stopColor="#d97757" />
        </linearGradient>
      </defs>

      <path
        d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
        fill="url(#zapGradient)"
        stroke="url(#zapOutline)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
