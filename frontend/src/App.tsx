import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Classrooms from "./pages/Classrooms";
import ExamSessions from "./pages/ExamSessions";
import Teachers from "./pages/Teachers";
import SeatingPlanPage from "./pages/SeatingPlan";
import Notifications from "./pages/Notifications"; 
// Wait, the original code had: Dashboard, Classrooms, ExamSessions, Teachers, SeatingPlanPage, Notifications

const navLinks = [
  { to: "/", icon: "space_dashboard", label: "Dashboard" },
  { to: "/classrooms", icon: "meeting_room", label: "Classrooms" },
  { to: "/sessions", icon: "event_available", label: "Exam Sessions" },
  // Let's repurpose the 'students' path to go to Seating Plans for now, or add a proper students page later.
  { to: "/seating", icon: "airline_seat_recline_extra", label: "Seating Plans" },
  { to: "/teachers", icon: "supervisor_account", label: "Teachers" },
  { to: "/notifications", icon: "notifications", label: "Notifications" },
];

export default function App() {
  const location = useLocation();

  return (
    <div className="bg-background font-body text-on-surface antialiased flex min-h-screen">
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-lowest border-r border-outline-variant z-50 flex flex-col justify-between p-5">
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>grid_view</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-on-surface font-headline">ProctorGrid</span>
                <span className="text-[10px] text-on-surface-variant font-mono tracking-wide">v2.4.0-core</span>
              </div>
            </div>
          </div>
          <nav className="flex flex-col gap-1.5">
            {navLinks.map((l) => {
              const isActive = location.pathname === l.to;
              return (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/"}
                  className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all ${
                    isActive
                      ? "bg-secondary-container text-on-surface font-medium border-l-2 border-primary"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface border-l-2 border-transparent"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{l.icon}</span>
                  <span>{l.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
        <div className="p-3 bg-surface-container rounded-lg border border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-on-surface">Proctor Engine</span>
              <span className="text-[10px] text-on-surface-variant font-mono">Operational · 99.9%</span>
            </div>
          </div>
          <span className="material-symbols-outlined text-secondary text-base">verified</span>
        </div>
      </aside>

      <div className="pl-64 flex-1 flex flex-col min-h-screen">
        <header className="fixed top-0 left-64 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant z-40 flex items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container border border-outline-variant rounded-md cursor-pointer hover:border-outline transition-colors">
              <span className="material-symbols-outlined text-primary text-sm">calendar_today</span>
              <span className="text-xs font-mono font-medium text-on-surface">Fall 2025 Midterms · Slot A</span>
              <span className="material-symbols-outlined text-on-surface-variant text-sm">expand_more</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-md border border-outline-variant text-on-surface-variant text-xs font-mono">
              <span className="material-symbols-outlined text-sm">search</span>
              <span>Search operational indices...</span>
              <span className="px-1.5 py-0.5 rounded bg-surface-container-high border border-outline-variant text-[10px]">⌘K</span>
            </div>
            <div className="h-4 w-px bg-outline-variant"></div>
            <div className="flex items-center gap-2.5 cursor-pointer">
              <div className="w-8 h-8 rounded-full border border-outline-variant bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person</span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-medium text-on-surface leading-tight">Operations Lead</span>
                <span className="text-[10px] text-on-surface-variant leading-tight">Proctor Center</span>
              </div>
            </div>
          </div>
        </header>

        <main className="w-full pt-16 px-8 min-h-screen bg-background relative z-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/classrooms" element={<Classrooms />} />
            <Route path="/sessions" element={<ExamSessions />} />
            <Route path="/teachers" element={<Teachers />} />
            <Route path="/seating" element={<SeatingPlanPage />} />
            <Route path="/notifications" element={<Notifications />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
