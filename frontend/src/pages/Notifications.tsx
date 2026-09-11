import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import type { DutyNotification } from "../api/types";

export default function Notifications() {
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState<string>("");

  const { data: notifications = [], isLoading } = useQuery<DutyNotification[]>({
    queryKey: ["notifications", sessionId],
    queryFn: () => {
      const qs = sessionId ? `?session_id=${sessionId}` : "";
      return api.get(`/notifications/${qs}`).then((r) => r.data.results ?? r.data);
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions-list"],
    queryFn: () => api.get("/exams/sessions/").then((r) => r.data.results ?? r.data),
  });

  const dispatch = useMutation({
    mutationFn: (id: number) => api.post(`/exams/sessions/${id}/dispatch/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="flex flex-col w-full pb-14 gap-8">
      <div className="relative w-full">
        <div className="absolute -top-16 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pt-2">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-widest bg-surface-container-high text-primary font-semibold">Communications</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-on-surface font-headline">Dispatch Log</h1>
            <p className="text-sm text-on-surface-variant max-w-xl leading-relaxed">Monitor automated duty emails sent to teaching staff.</p>
          </div>
          <div className="flex items-center gap-3">
            <select 
              className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-48"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
            >
              <option value="">All Sessions</option>
              {sessions.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button 
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary font-medium text-xs hover:opacity-95 transition-all shadow-md disabled:opacity-50"
              onClick={() => dispatch.mutate(Number(sessionId))}
              disabled={!sessionId || dispatch.isPending}
            >
              <span className="material-symbols-outlined text-[17px]">send</span>
              <span>Dispatch Now</span>
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 justify-center h-32">
          <div className="w-6 h-6 border-2 border-surface-container-highest border-t-primary rounded-full animate-spin" />
          <span className="text-on-surface-variant text-sm font-mono">Loading dispatch log...</span>
        </div>
      ) : (
        <div className="rounded-xl border border-outline-variant bg-surface-container/30 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-outline-variant">
                <th className="px-5 py-3 text-[11px] font-mono font-semibold text-secondary uppercase tracking-wider">Teacher</th>
                <th className="px-5 py-3 text-[11px] font-mono font-semibold text-secondary uppercase tracking-wider">Session</th>
                <th className="px-5 py-3 text-[11px] font-mono font-semibold text-secondary uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-[11px] font-mono font-semibold text-secondary uppercase tracking-wider">Sent At</th>
                <th className="px-5 py-3 text-[11px] font-mono font-semibold text-secondary uppercase tracking-wider text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {notifications.map((n) => (
                <tr key={n.id} className="hover:bg-surface-container-high/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm text-on-surface">{n.teacher_detail?.name}</span>
                      <span className="text-[10px] font-mono text-secondary">{n.teacher_detail?.email}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-on-surface-variant">{n.session_detail?.name}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${
                      n.status === 'sent' ? 'bg-tertiary-container/30 text-tertiary border-tertiary/20' : 
                      n.status === 'failed' ? 'bg-error-container/30 text-error border-error/20' : 
                      'bg-surface-container-highest text-secondary border-outline-variant'
                    }`}>
                      {n.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[11px] font-mono text-secondary">
                    {n.sent_at ? new Date(n.sent_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right text-[11px] text-on-surface-variant max-w-[200px] truncate">
                    {n.error_message || 'OK'}
                  </td>
                </tr>
              ))}
              {notifications.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-on-surface-variant text-sm">
                    No notifications logged.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
