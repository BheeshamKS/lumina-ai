export const ToggleSwitch = ({ isOn, onToggle, color }) => {
  return (
    <button
      role="switch"
      aria-checked={isOn}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="relative shrink-0 cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
      style={{
        width: "44px",
        height: "26px",
        backgroundColor: isOn
          ? color || "var(--color-toggleSwitch)"
          : "#000000",
        transition: "background-color 250ms ease",
        border: "none",
        padding: 0,
      }}
    >
      {/* Track inner shadow for depth */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "9999px",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.25)",
          pointerEvents: "none",
        }}
      />
      {/* Thumb */}
      <span
        style={{
          position: "absolute",
          top: "3px",
          left: "3px",
          width: "20px",
          height: "20px",
          borderRadius: "9999px",
          backgroundColor: "#ffffff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.35), 0 0.5px 1px rgba(0,0,0,0.2)",
          transform: isOn ? "translateX(18px)" : "translateX(0px)",
          transition: "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          willChange: "transform",
        }}
      />
    </button>
  );
};
