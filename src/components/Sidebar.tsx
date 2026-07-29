import { Fingerprint, ChevronsLeft, ChevronsRight, ShieldCheck } from "lucide-react";
import { NAV_ITEMS } from "../lib/navItems";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  activeSection: string;
  onNavigate: (id: string) => void;
  mobileOpen: boolean;
};

export function Sidebar({ collapsed, onToggle, activeSection, onNavigate, mobileOpen }: SidebarProps) {
  return (
    <aside className={`pq-sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>
      <div className="pq-sidebar-brand">
        <div className="pq-sidebar-logo">
          <Fingerprint size={20} color="#fff" />
        </div>
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 16, letterSpacing: 0.2, color: "var(--text)" }}>PunchIQ</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--faint)", letterSpacing: 0.6, textTransform: "uppercase" }}>Work hours tracker</div>
          </div>
        )}
      </div>

      <nav className="pq-sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              className={`pq-sidebar-link${active ? " active" : ""}`}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              style={collapsed ? { justifyContent: "center" } : undefined}
            >
              <Icon size={17} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <button className="pq-sidebar-toggle" onClick={onToggle} style={{ marginBottom: 12 }}>
        {collapsed ? <ChevronsRight size={15} /> : <><ChevronsLeft size={15} /> <span style={{ fontSize: 12 }}>Collapse</span></>}
      </button>

      {!collapsed && (
        <div className="pq-sidebar-footer">
          <ShieldCheck size={13} /> Local-only data
        </div>
      )}
    </aside>
  );
}
