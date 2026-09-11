import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import type { ExamSession } from "../api/types";

function JobProgress({ jobId }: { jobId: number }) {
  const { data } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => api.get(`/jobs/${jobId}/`).then((r) => r.data),
    refetchInterval: (q) => (q.state.data?.status === "done" || q.state.data?.status === "failed" ? false : 1500),
  });
  
  if (!data) return (
    <div className="flex items-center gap-2 mt-4 text-xs text-secondary">
      <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>
      Starting job...
    </div>
  );
  
  return (
    <div className="mt-4 bg-surface-container-low p-3 rounded-lg border border-outline-variant">
      <div className="flex justify-between text-xs mb-2">
        <span className="text-on-surface-variant font-medium">{data.progress_label || data.status}</span>
        <span className="text-secondary font-mono">{data.progress_pct}%</span>
      </div>
      <div className="w-full bg-surface-container-highest rounded-full h-1 overflow-hidden">
        <div className={`h-1 rounded-full transition-all duration-300 ${data.status === 'failed' ? 'bg-error' : 'bg-tertiary'}`} style={{ width: `${data.progress_pct}%` }} />
      </div>
      {data.status === "done" && data.result_ref && (
        <div className="mt-2 text-[11px] text-tertiary flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">check_circle</span>
          {data.result_ref.imported} students imported
          {data.result_ref.errors?.length > 0 && ` (${data.result_ref.errors.length} row errors)`}
        </div>
      )}
      {data.status === "failed" && (
        <div className="mt-2 text-[11px] text-error flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {data.error_message}
        </div>
      )}
    </div>
  );
}

export default function ExamSessions() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [uploadJobId, setUploadJobId] = useState<number | null>(null);
  const [uploadSessionId, setUploadSessionId] = useState<number | null>(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [sessionForm, setSessionForm] = useState({ name: "", date: "", duty_gap_slots: 1, daily_duty_cap: 2 });

  const { data: sessions = [], isLoading } = useQuery<ExamSession[]>({
    queryKey: ["sessions"],
    queryFn: () => api.get("/exams/sessions/").then((r) => r.data.results ?? r.data),
  });

  const createSession = useMutation({
    mutationFn: () => api.post("/exams/sessions/", sessionForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sessions"] }); setShowNewSession(false); },
  });

  const handleUpload = async (sessionId: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.post(`/exams/sessions/${sessionId}/students/upload`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setUploadSessionId(sessionId);
    setUploadJobId(res.data.job_id);
  };

  return (
    <div className="flex flex-col w-full pb-16 space-y-10">
      {/* Subtle Ambient Glow */}
      <div className="relative w-full">
        <div className="absolute -top-12 left-1/4 w-96 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="absolute top-10 right-10 w-72 h-36 bg-tertiary/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
      </div>

      {/* Page Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-primary uppercase">
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-ping"></span>
            Exam Schedules
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface font-headline">
            Sessions & Slots
          </h1>
          <p className="text-sm text-on-surface-variant max-w-xl font-normal">
            Manage exam periods, slots, constraints, and import student data.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary hover:opacity-90 text-xs font-semibold tracking-wide transition-all shadow-md shadow-primary/20" onClick={() => setShowNewSession(true)} type="button">
            <span className="material-symbols-outlined text-base">add</span>
            <span>New Session</span>
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center gap-3 justify-center h-32">
          <div className="w-6 h-6 border-2 border-surface-container-highest border-t-primary rounded-full animate-spin" />
          <span className="text-on-surface-variant text-sm font-mono">Loading sessions...</span>
        </div>
      ) : (
        <section className="w-full space-y-4">
          {sessions.map((s) => (
            <div key={s.id} className="rounded-xl bg-surface-container/60 border border-outline-variant p-5 transition-all hover:bg-surface-container-high/60">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">{expanded === s.id ? 'folder_open' : 'folder'}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-on-surface">{s.name}</h3>
                    <div className="text-[11px] font-mono text-secondary mt-1">
                      {s.date} <span className="mx-1">•</span> {s.slots.length} Slots Configured
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-container-highest hover:bg-primary hover:text-on-primary text-on-surface-variant text-xs font-medium transition-colors cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <span className="material-symbols-outlined text-[16px]">upload_file</span>
                    <span>Upload Students</span>
                    <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleUpload(s.id, e.target.files[0]); }} />
                  </label>
                  <span className={`material-symbols-outlined text-secondary transition-transform duration-200 ${expanded === s.id ? 'rotate-180' : ''}`}>expand_more</span>
                </div>
              </div>

              {uploadSessionId === s.id && uploadJobId && (
                <JobProgress jobId={uploadJobId} />
              )}

              {expanded === s.id && (
                <div className="mt-5 pl-14 flex flex-col gap-3">
                  {s.slots.length === 0 ? (
                    <div className="text-xs text-secondary italic">No slots defined for this session.</div>
                  ) : (
                    s.slots.map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/50 group">
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-mono font-semibold text-primary w-14">{slot.start_time}</span>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-on-surface">{slot.label}</span>
                            <span className="text-[10px] text-secondary font-mono">{slot.duration_minutes} Minutes</span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          {slot.slot_courses.map((sc) => (
                            <span key={sc.id} className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-container-highest text-on-surface-variant border border-outline-variant">
                              {sc.course_detail.code}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="text-center py-12 text-sm text-secondary border border-dashed border-outline-variant rounded-xl">
              No exam sessions found. Create one to get started.
            </div>
          )}
        </section>
      )}

      {/* New Session Modal */}
      {showNewSession && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm" onClick={() => setShowNewSession(false)}>
          <div className="bg-surface-container border border-outline-variant rounded-xl p-7 min-w-[400px] max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-headline font-semibold text-on-surface mb-5">
              New Exam Session
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono tracking-widest text-on-surface-variant uppercase">Name</label>
                <input 
                  className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full" 
                  value={sessionForm.name} 
                  onChange={(e) => setSessionForm((p) => ({ ...p, name: e.target.value }))} 
                  placeholder="e.g. End Semester Nov 2026" 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono tracking-widest text-on-surface-variant uppercase">Date</label>
                <input 
                  type="date"
                  className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full [color-scheme:dark]" 
                  value={sessionForm.date} 
                  onChange={(e) => setSessionForm((p) => ({ ...p, date: e.target.value }))} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono tracking-widest text-on-surface-variant uppercase">Duty Gap (Slots)</label>
                  <input 
                    type="number" min={0}
                    className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full" 
                    value={sessionForm.duty_gap_slots} 
                    onChange={(e) => setSessionForm((p) => ({ ...p, duty_gap_slots: Number(e.target.value) }))} 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono tracking-widest text-on-surface-variant uppercase">Daily Duty Cap</label>
                  <input 
                    type="number" min={1}
                    className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full" 
                    value={sessionForm.daily_duty_cap} 
                    onChange={(e) => setSessionForm((p) => ({ ...p, daily_duty_cap: Number(e.target.value) }))} 
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors" onClick={() => setShowNewSession(false)}>Cancel</button>
              <button 
                className="px-4 py-2 rounded-lg bg-primary text-on-primary font-medium text-xs hover:opacity-90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={() => createSession.mutate()} 
                disabled={createSession.isPending || !sessionForm.name || !sessionForm.date}
              >
                {createSession.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
