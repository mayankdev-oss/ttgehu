import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import api from "../api/client";
import type { DashboardSummary } from "../api/types";

export default function Dashboard() {
  const { data, isLoading, error } = useQuery<DashboardSummary>({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/dashboard/summary/").then((r) => r.data),
    refetchInterval: 30_000,
  });

  if (isLoading || !data) return (
    <div className="flex items-center gap-3 h-48 justify-center">
      <div className="w-8 h-8 border-2 border-surface-container-highest border-t-primary rounded-full animate-spin" />
      <span className="text-on-surface-variant font-mono text-sm">Loading telemetry...</span>
    </div>
  );

  const d = data!;
  
  return (
    <div className="flex flex-col w-full pb-16 space-y-12">
      {/* Subtle Ambient Glow */}
      <div className="relative w-full">
        <div className="absolute -top-16 left-1/4 w-96 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="absolute -top-10 right-1/3 w-64 h-32 bg-primary-container/10 rounded-full blur-2xl pointer-events-none -z-10"></div>
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest text-primary uppercase font-semibold">Workspace</span>
              <span className="text-secondary text-xs">•</span>
              <span className="text-[10px] font-mono tracking-widest text-on-surface-variant uppercase">Fall 2025 Midterms</span>
            </div>
            <h1 className="text-3xl font-light tracking-tight text-on-surface font-headline">Dashboard</h1>
            <p className="text-xs font-normal text-on-surface-variant">Exam operations overview & real-time dispatch control.</p>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-3">
            <button className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-all duration-200 text-xs font-medium text-on-surface shadow-sm hover:text-white" type="button">
              <span className="material-symbols-outlined text-sm text-secondary group-hover:text-primary transition-colors">add</span>
              <span>New Session</span>
            </button>
            <button className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-fixed-dim transition-all duration-200 text-xs font-medium shadow-md shadow-primary/10" type="button">
              <span className="material-symbols-outlined text-sm transition-transform group-hover:rotate-45 duration-300">auto_awesome</span>
              <span>Run Solver</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Trio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="relative overflow-hidden rounded-xl bg-surface-container/70 backdrop-blur-md p-6 transition-all duration-300 hover:bg-surface-container-high/60 group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">Total Classrooms</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-tertiary-container/30 text-tertiary">Active</span>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-light tracking-tight text-on-surface font-headline">{d.total_classrooms}</span>
            <span className="text-xs text-on-surface-variant">Venues</span>
          </div>
          <div className="pt-2 flex items-center gap-1.5 text-xs text-secondary font-mono">
            <span className="material-symbols-outlined text-sm text-primary">domain</span>
            <span>Configured in system</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-surface-container/70 backdrop-blur-md p-6 transition-all duration-300 hover:bg-surface-container-high/60 group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">Total Teachers</span>
            <span className="w-2 h-2 rounded-full bg-tertiary"></span>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-light tracking-tight text-on-surface font-headline">{d.total_teachers}</span>
            <span className="text-xs text-on-surface-variant">Staff</span>
          </div>
          <div className="pt-2 flex items-center gap-1.5 text-xs text-secondary font-mono">
            <span className="material-symbols-outlined text-sm text-primary">supervisor_account</span>
            <span>Available for invigilation</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-surface-container/70 backdrop-blur-md p-6 transition-all duration-300 hover:bg-surface-container-high/60 group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">Action Required</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${d.unresolved_conflicts > 0 ? "bg-error-container/40 text-on-error-container" : "bg-tertiary-container/30 text-tertiary"}`}>
              {d.unresolved_conflicts > 0 ? "Urgent" : "All Clear"}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className={`text-3xl font-light tracking-tight font-headline ${d.unresolved_conflicts > 0 ? "text-error" : "text-tertiary"}`}>
              {d.unresolved_conflicts.toString().padStart(2, '0')}
            </span>
            <span className="text-xs text-on-surface-variant">Open Conflicts</span>
          </div>
          <div className="pt-2 flex items-center gap-1.5 text-xs text-secondary font-mono">
            <span className={`material-symbols-outlined text-sm ${d.unresolved_conflicts > 0 ? "text-error" : "text-tertiary"}`}>
              {d.unresolved_conflicts > 0 ? "notification_important" : "check_circle"}
            </span>
            <span className={d.unresolved_conflicts > 0 ? "text-error/80" : "text-tertiary/80"}>
              {d.unresolved_conflicts > 0 ? "Requires manual allocation review" : "No conflicts detected"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content: Restrained Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Duty Distribution (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-sm font-medium tracking-tight text-on-surface font-headline">Teacher Duty Load</h2>
            <span className="text-xs font-mono text-secondary">Top 20 Teachers</span>
          </div>
          <div className="rounded-xl bg-surface-container/60 p-5 border border-outline-variant">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={d.duty_distribution} layout="vertical" margin={{ left: 80, right: 16 }}>
                <XAxis type="number" tick={{ fill: "var(--color-on-surface-variant)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="teacher__name" type="category" tick={{ fill: "var(--color-on-surface-variant)", fontSize: 11 }} width={80} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--color-surface-container-highest)", border: "1px solid var(--color-outline-variant)", borderRadius: 8, color: "var(--color-on-surface)" }}
                  itemStyle={{ color: "var(--color-on-surface)" }}
                />
                <Bar dataKey="duty_count" radius={[0, 4, 4, 0]}>
                  {d.duty_distribution.map((_, i) => (
                    <Cell key={i} fill="var(--color-primary)" opacity={0.75 + (i / d.duty_distribution.length) * 0.25} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Notification Stats & Activity (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-sm font-medium tracking-tight text-on-surface font-headline">Notification Dispatch</h2>
          </div>
          <div className="rounded-xl bg-surface-container/60 p-5 space-y-4 border border-outline-variant">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3.5">
                <span className="material-symbols-outlined text-tertiary">check_circle</span>
                <span className="text-xs font-medium text-on-surface">Sent Successfully</span>
              </div>
              <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-md bg-tertiary-container/30 text-tertiary">
                {d.notification_stats.sent}
              </span>
            </div>
            <div className="h-px w-full bg-surface-container-highest/60"></div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3.5">
                <span className="material-symbols-outlined text-error">error</span>
                <span className="text-xs font-medium text-on-surface">Delivery Failed</span>
              </div>
              <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-md bg-error-container/30 text-error">
                {d.notification_stats.failed}
              </span>
            </div>
            <div className="h-px w-full bg-surface-container-highest/60"></div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3.5">
                <span className="material-symbols-outlined text-secondary">pending</span>
                <span className="text-xs font-medium text-on-surface">Pending Dispatch</span>
              </div>
              <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-md bg-surface-container-highest text-secondary">
                {d.notification_stats.pending}
              </span>
            </div>
          </div>

          <div className="pt-6">
            <details className="group select-none" open>
              <summary className="flex items-center justify-between cursor-pointer list-none text-xs font-mono text-secondary hover:text-on-surface transition-colors py-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs transition-transform duration-200 group-open:rotate-90">chevron_right</span>
                  <span>Recent System Activity</span>
                </div>
                <span className="text-[11px] text-on-surface-variant group-open:opacity-0 transition-opacity">
                  {d.recent_activity.length} events
                </span>
              </summary>
              <div className="mt-4 rounded-xl bg-surface-container/40 p-5 space-y-3 border border-outline-variant">
                {d.recent_activity.length === 0 && <p className="text-xs text-on-surface-variant">No activity recorded yet.</p>}
                {d.recent_activity.map((a, i) => (
                  <div key={i} className="flex items-start justify-between text-xs py-1 gap-4">
                    <div className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-primary shrink-0"></span>
                      <div className="flex flex-col">
                        <span className="text-on-surface">{a.description}</span>
                        <span className="text-[10px] text-on-surface-variant">{a.actor__username}</span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-secondary shrink-0">
                      {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
