import { NavLink } from "react-router-dom";
import { AudioLines, Music2, LayoutDashboard } from "lucide-react";

const destinations = [
  { to: "/", label: "Requests", Icon: Music2, end: true },
  {
    to: "/musician/live",
    label: "Music console",
    Icon: AudioLines,
    end: false,
  },
  { to: "/staff", label: "Staff desk", Icon: LayoutDashboard, end: false },
];
export function ProductNavigation() {
  return (
    <header className="product-nav-shell">
      <a className="product-skip-link" href="#workspace-content">
        Skip to content
      </a>
      <div className="product-nav-glass">
        <NavLink
          to="/"
          className="product-wordmark"
          aria-label="VSPH song requests"
        >
          <span className="product-mark">
            <AudioLines size={21} />
          </span>
          <span>
            VSPH<small>Live experiences</small>
          </span>
        </NavLink>
        <nav aria-label="Main navigation">
          {destinations.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `product-nav-link${isActive ? " is-active" : ""}`
              }
            >
              <Icon size={17} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
