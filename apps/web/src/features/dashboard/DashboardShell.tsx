import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  Headphones,
  LayoutDashboard,
  LayoutTemplate,
  Presentation,
  Rocket,
  Search,
  Settings,
  Trash2,
  User,
} from "lucide-react";
import { PraxisMark } from "@/components/editor/PraxisMark";
import { ImportPresentationModal } from "@/features/presentation-import/components/ImportPresentationModal";
import { useAuth } from "@/auth/use-auth";
import { DashboardSearchContext } from "./searchContext";
import { cn } from "@/lib/utils";

/**
 * Dashboard shell per the Platform Figma: 240px sidebar (logo, nav, upgrade
 * card, settings/support), 64px top bar (search + account), gray-100 content
 * region. Views render in the outlet and read the live search query from
 * context.
 */

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/templates", label: "Template", icon: LayoutTemplate, end: false },
  { to: "/app/presentations", label: "Presentations", icon: Presentation, end: false },
  { to: "/app/trash", label: "Trash", icon: Trash2, end: false },
];

function Sidebar() {
  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="px-[23px] pt-[15px]">
        <Link to="/" title="Praxis home" className="inline-flex">
          <PraxisMark size={32} />
        </Link>
      </div>

      <nav className="mx-auto mt-[56px] flex w-[208px] flex-col gap-1" aria-label="Dashboard">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex h-11 items-center gap-2 rounded-xl p-4 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                isActive
                  ? "bg-[#f2eeff] font-semibold text-[#652ff3]"
                  : "font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700",
              )
            }
          >
            <Icon size={22} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mx-auto mt-auto w-[208px] pb-6">
        {/* Upgrade card with overlapping rocket badge */}
        <div className="relative pt-8">
          <div className="absolute left-1/2 top-0 z-10 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border-2 border-[#c4bcfb] bg-white">
            <Rocket size={30} className="text-[#652ff3]" strokeWidth={1.6} />
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-[#652ff3] px-5 pb-5 pt-12 text-center">
            <span
              aria-hidden
              className="pointer-events-none absolute -left-[61px] top-[84px] h-[141px] w-[141px] rounded-full bg-white/10"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -top-[65px] left-[123px] h-[141px] w-[141px] rounded-full bg-white/10"
            />
            <h3 className="text-base font-bold tracking-[-0.32px] text-gray-50">
              Upgrade to Pro
            </h3>
            <p className="mt-1 text-xs font-medium leading-relaxed text-gray-300">
              Team workspaces, cloud sync, and verified sharing
            </p>
            <button
              type="button"
              disabled
              title="Praxis Pro is coming soon"
              className="mt-3 h-10 w-full cursor-not-allowed rounded-xl bg-[#f2eeff] text-base font-semibold text-[#652ff3] opacity-90"
            >
              Coming soon
            </button>
          </div>
        </div>

        <div className="my-6 h-px w-full bg-gray-200" />

        <div className="flex flex-col gap-1">
          <a
            href="https://github.com/Kavana-Labs/praxis/tree/master/docs"
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center gap-2 rounded-xl p-4 text-base font-semibold text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <Settings size={22} strokeWidth={1.8} />
            Settings
          </a>
          <a
            href="https://github.com/Kavana-Labs/praxis/issues"
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center gap-2 rounded-xl p-4 text-base font-semibold text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <Headphones size={22} strokeWidth={1.8} />
            Support Center
          </a>
        </div>
      </div>
    </aside>
  );
}

function AccountMenu() {
  const { user, isAuthenticated, service } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Account"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-600 text-sm font-semibold text-white transition-colors hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        {user?.displayName ? (
          user.displayName
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? "")
            .join("")
        ) : (
          <User size={20} />
        )}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-12 z-30 w-60 rounded-lg border border-gray-200 bg-white p-3 shadow-lg animate-in fade-in zoom-in-95 duration-100"
        >
          {isAuthenticated && user ? (
            <>
              <p className="truncate text-sm font-semibold text-gray-800">
                {user.displayName ?? user.email}
              </p>
              <p className="mt-0.5 truncate text-xs text-gray-500">{user.email}</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                Documents are stored in this browser; cloud sync is coming with
                Praxis Pro.
              </p>
              <Link
                to="/app/profile"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="mt-3 block w-full rounded-md border border-gray-200 px-3 py-1.5 text-center text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                Profile settings
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  void service.signOut();
                  setOpen(false);
                }}
                className="mt-1.5 w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-800">Local workspace</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                Documents are stored in this browser. Create an account to get
                a profile{service.kind === "firebase" ? " and verified email" : ""}.
              </p>
              <Link
                to="/auth/login"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="mt-3 block w-full rounded-md bg-[#652ff3] px-3 py-1.5 text-center text-xs font-semibold text-white transition-colors hover:bg-brand-600"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function DashboardShell() {
  const [query, setQuery] = useState("");

  return (
    <div className="flex h-screen overflow-hidden bg-[#f3f4f6] text-gray-900">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-8">
          <div className="relative">
            <Search
              size={20}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search presentations.."
              aria-label="Search presentations"
              className="h-10 w-[320px] rounded-xl border border-gray-200 bg-[#f3f4f6] pl-10 pr-3 text-base font-medium text-gray-800 placeholder:text-gray-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-300"
            />
          </div>
          <AccountMenu />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1136px] px-6 py-10 xl:px-0">
            <DashboardSearchContext.Provider value={query}>
              <Outlet />
            </DashboardSearchContext.Provider>
          </div>
        </main>
      </div>

      <ImportPresentationModal />
    </div>
  );
}
