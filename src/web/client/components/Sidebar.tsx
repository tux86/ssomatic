import React from "react";

type View = "dashboard" | "refresh" | "daemon" | "settings";

interface SidebarProps {
  active: View;
  onChange: (view: View) => void;
  profileCount: number;
}

const NAV_ITEMS: { id: View; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "refresh", label: "Refresh", icon: "refresh" },
  { id: "daemon", label: "Auto-Refresh", icon: "clock" },
  { id: "settings", label: "Settings", icon: "settings" },
];

function NavIcon({ icon }: { icon: string }) {
  const props = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (icon) {
    case "grid":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...props}>
          <path d="M21 2v6h-6" />
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
          <path d="M3 22v-6h6" />
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        </svg>
      );
    case "clock":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "settings":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      );
    default:
      return null;
  }
}

export function Sidebar({ active, onChange, profileCount }: SidebarProps) {
  return (
    <aside className="w-52 h-full flex flex-col bg-white/[0.02]">
      {/* Logo */}
      <div className="pt-5 px-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </div>
          <div>
            <span className="font-semibold text-[13px] text-text-primary tracking-tight">
              SSOmatic
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <div className="mb-3">
          <span className="px-3 text-[10px] font-semibold text-text-muted/60 uppercase tracking-widest">
            Menu
          </span>
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`
                w-full flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[12.5px] font-medium
                transition-all duration-150 mb-px
                ${
                  isActive
                    ? "bg-white/[0.08] text-text-primary shadow-sm"
                    : "text-text-muted hover:bg-white/[0.04] hover:text-text-secondary"
                }
              `}
            >
              <NavIcon icon={item.icon} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-status-valid animate-pulse-dot" />
          <span className="text-[10.5px] text-text-muted">
            {profileCount} profile{profileCount !== 1 ? "s" : ""} connected
          </span>
        </div>
      </div>
    </aside>
  );
}
