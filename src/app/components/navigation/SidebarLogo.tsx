import { useState } from "react";
import { NCCBankBoardLogo } from "./NCCBankBoardLogo";

interface SidebarLogoProps {
  onLogoClick: () => void;
}

export function SidebarLogo({ onLogoClick }: SidebarLogoProps) {
  const [logoHovered, setLogoHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onLogoClick}
      onMouseEnter={() => setLogoHovered(true)}
      onMouseLeave={() => setLogoHovered(false)}
      className="sidebar-logo"
      aria-label="Go to Dashboard"
      title="Go to Dashboard"
      style={{ opacity: logoHovered ? 0.85 : 1, transition: "opacity 0.15s" }}
    >
      <NCCBankBoardLogo
        size={36}
        className="sidebar-logo__image"
      />
    </button>
  );
}
