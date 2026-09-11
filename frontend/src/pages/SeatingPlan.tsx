import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import type { ExamSession, SeatingPlan, SeatAssignment, Classroom } from "../api/types";

/* ── Job progress bar ─────────────────────────────────────────────────── */
function JobProgress({ jobId, onDone }: { jobId: number; onDone: () => void }) {
  const { data } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => api.get(`/jobs/${jobId}/`).then((r) => r.data),
    refetchInterval: (q) => {
      if (q.state.data?.status === "done") { onDone(); return false; }
      if (q.state.data?.status === "failed") return false;
      return 1200;
    },
  });

  if (!data) return (
    <div className="flex items-center gap-2 my-4 text-xs text-secondary">
      <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>
      Initializing Generation Job...
    </div>
  );

  return (
    <div className="my-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant">
      <div className="flex justify-between text-xs mb-3">
        <span className="text-on-surface-variant font-medium font-mono uppercase tracking-wider">{data.progress_label || data.status}</span>
        <span className="text-primary font-mono font-bold">{data.progress_pct}%</span>
      </div>
      <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full transition-all duration-500 ${data.status === 'failed' ? 'bg-error' : 'bg-primary'}`} style={{ width: `${data.progress_pct}%` }} />
      </div>
      {data.status === "failed" && (
        <div className="mt-3 text-[11px] text-on-error-container bg-error-container/40 p-2 rounded flex items-start gap-1.5 border border-error/20">
          <span className="material-symbols-outlined text-[14px] text-error mt-0.5">error</span>
          <span>{data.error_message}</span>
        </div>
      )}
    </div>
  );
}

/* ── Seat grid ────────────────────────────────────────────────────────── */
function SeatGrid({
  assignments,
  cols,
  selectedIds,
  onSelect,
}: {
  assignments: SeatAssignment[];
  cols: number;
  selectedIds: number[];
  onSelect: (id: number) => void;
}) {
  const courses = [...new Set(assignments.filter((a) => a.student_detail).map((a) => a.student_detail!.course_code))];
  const palette = ["#a78bfa", "#34d399", "#d29922", "#a371f7", "#f78166", "#56d364", "#ffa657", "#79c0ff"];
  const courseColor: Record<string, string> = {};
  courses.forEach((c, i) => { courseColor[c] = palette[i % palette.length]; });

  return (
    <div className="grid gap-1.5 mt-3 p-4 bg-surface-container-low rounded-xl border border-outline-variant/50" style={{ gridTemplateColumns: `repeat(${cols}, minmax(48px, 1fr))` }}>
      {assignments.map((a) => {
        const isSelected = selectedIds.includes(a.id);
        const course = a.student_detail?.course_code;
        const borderColor = course ? courseColor[course] : "transparent";
        const isOccupied = !!a.student;

        return (
          <div
            key={a.id}
            onClick={() => onSelect(a.id)}
            className={`
              relative flex flex-col items-center justify-center p-2 rounded-lg border min-h-[56px] transition-all cursor-pointer group select-none
              ${!isOccupied ? "bg-surface-container-lowest border-outline-variant/30 text-secondary hover:border-outline-variant" : ""}
              ${isOccupied && !a.is_conflict ? "bg-surface-container/40 border-outline-variant/50 hover:bg-surface-container" : ""}
              ${a.is_conflict ? "bg-error-container/10 border-error/40 hover:bg-error-container/20" : ""}
              ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary shadow-[0_0_12px_rgba(167,139,250,0.3)] z-10 scale-105" : ""}
            `}
            style={isOccupied && !isSelected && !a.is_conflict ? { borderBottomColor: borderColor, borderBottomWidth: 2 } : {}}
            title={a.student_detail ? `${a.student_detail.roll_number} – ${a.student_detail.name}` : "Empty Seat"}
          >
            <span className="absolute top-1 left-1.5 text-[8px] font-mono text-on-surface-variant/50 font-bold tracking-wider">
              {a.seat_detail?.label}
            </span>
            
            {a.student_detail && (
              <div className="flex flex-col items-center mt-2 w-full text-center overflow-hidden">
                <span className="text-[10px] font-mono font-semibold text-on-surface">{a.student_detail.roll_number.split('-').pop() || a.student_detail.roll_number}</span>
                <span className="text-[8px] font-medium text-on-surface-variant truncate w-full max-w-[44px]">{a.student_detail.name.split(' ')[0]}</span>
                <span className="text-[8px] mt-0.5 opacity-80" style={{ color: borderColor }}>{course}</span>
              </div>
            )}
            
            {!isOccupied && <span className="text-[10px] opacity-30">—</span>}
            
            {a.is_conflict && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-error text-on-error rounded-full flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined" style={{ fontSize: 8 }}>warning</span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────────── */
export default function SeatingPlanPage() {
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [slotId, setSlotId] = useState<number | null>(null);
  const [planId, setPlanId] = useState<number | null>(null);
  const [genJobId, setGenJobId] = useState<number | null>(null);
  const [selectedAssignments, setSelectedAssignments] = useState<number[]>([]);
  const [swapWarnings, setSwapWarnings] = useState<string[]>([]);
  const [ackConflicts, setAckConflicts] = useState(false);

  const { data: sessions = [] } = useQuery<ExamSession[]>({
    queryKey: ["sessions"],
    queryFn: () => api.get("/exams/sessions/").then((r) => r.data.results ?? r.data),
  });

  const { data: classrooms = [] } = useQuery<Classroom[]>({
    queryKey: ["classrooms"],
    queryFn: () => api.get("/classrooms/").then((r) => r.data.results ?? r.data),
  });

  const selectedSession = sessions.find((s) => s.id === sessionId);
  const selectedSlot = selectedSession?.slots.find((s) => s.id === slotId);

  const { data: plans = [], refetch: refetchPlans } = useQuery<SeatingPlan[]>({
    queryKey: ["plans", sessionId, slotId],
    queryFn: () =>
      api.get(`/exams/sessions/${sessionId}/slots/${slotId}/plans/`).then((r) => r.data.results ?? r.data),
    enabled: !!sessionId && !!slotId,
  });

  const selectedPlan = plans.find((p) => p.id === planId);

  const { data: planDetail } = useQuery<SeatingPlan>({
    queryKey: ["plan-detail", planId],
    queryFn: () => api.get(`/seating/${planId}/`).then((r) => r.data),
    enabled: !!planId,
  });

  const byClassroom: Record<number, SeatAssignment[]> = {};
  planDetail?.assignments?.forEach((a) => {
    if (!byClassroom[a.classroom]) byClassroom[a.classroom] = [];
    byClassroom[a.classroom].push(a);
  });

  const generate = useMutation({
    mutationFn: (payload: { classroom_ids: number[]; discard_existing?: boolean }) =>
      api.post(`/exams/sessions/${sessionId}/slots/${slotId}/plans/generate/`, payload),
    onSuccess: (res) => { setGenJobId(res.data.job_id); setPlanId(res.data.plan_id); },
  });

  const swap = useMutation({
    mutationFn: () =>
      api.post(`/seating/${planId}/swap/`, {
        assignment_a_id: selectedAssignments[0],
        assignment_b_id: selectedAssignments[1],
      }),
    onSuccess: (res) => {
      setSwapWarnings(res.data.warnings ?? []);
      setSelectedAssignments([]);
      qc.invalidateQueries({ queryKey: ["plan-detail", planId] });
    },
  });

  const approve = useMutation({
    mutationFn: () =>
      api.post(`/seating/${planId}/approve/`, { acknowledged_conflicts: ackConflicts }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans", sessionId, slotId] }); refetchPlans(); },
  });

  const handleSelect = (id: number) => {
    if (planDetail?.status === "approved") return;
    setSelectedAssignments((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
    setSwapWarnings([]);
  };

  return (
    <div className="flex flex-col w-full pb-14 space-y-7">
      <div className="relative w-full">
        <div className="absolute -top-10 left-1/3 w-96 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="absolute -top-12 right-1/4 w-80 h-36 bg-tertiary/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-surface-container/60 backdrop-blur-md p-6 rounded-xl border border-outline-variant shadow-xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-surface-container-highest text-primary font-semibold">Engine V3 · Active Topology</span>
              {planDetail && (
                <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-mono">
                  <span className={`w-2 h-2 rounded-full ${planDetail.status === 'approved' ? 'bg-tertiary' : 'bg-primary animate-pulse'}`}></span>
                  <span>{planDetail.status === 'approved' ? 'Locked' : 'Draft Mode'}</span>
                </div>
              )}
            </div>
            <h1 className="text-2xl lg:text-3xl font-headline font-bold text-on-surface tracking-tight">Seating Matrix & Allocations</h1>
            
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-secondary uppercase tracking-widest">Target Session</label>
                <select 
                  className="bg-surface-container-lowest border border-outline-variant rounded-md px-3 py-1.5 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none max-w-[200px]"
                  value={sessionId ?? ""} 
                  onChange={(e) => { setSessionId(Number(e.target.value)); setSlotId(null); setPlanId(null); }}
                >
                  <option value="">— Select session —</option>
                  {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-secondary uppercase tracking-widest">Target Slot</label>
                <select 
                  className="bg-surface-container-lowest border border-outline-variant rounded-md px-3 py-1.5 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none w-[160px] disabled:opacity-50 disabled:cursor-not-allowed"
                  value={slotId ?? ""} 
                  onChange={(e) => { setSlotId(Number(e.target.value)); setPlanId(null); }} 
                  disabled={!sessionId}
                >
                  <option value="">— Select slot —</option>
                  {selectedSession?.slots.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            {planDetail && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-high text-xs font-mono border border-outline-variant/50">
                <span className={`inline-block w-2 h-2 rounded-full ${planDetail.conflict_count > 0 ? "bg-error animate-ping" : "bg-tertiary"}`}></span>
                <span className="text-on-surface font-medium">Solver: {planDetail.conflict_count > 0 ? "Warning" : "Verified"}</span>
                {planDetail.conflict_count > 0 && (
                  <span className="text-on-error-container bg-error-container px-2 py-0.5 rounded text-[11px] font-semibold">{planDetail.conflict_count} Conflict(s)</span>
                )}
              </div>
            )}
            {slotId && !genJobId && (
              <button 
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary font-medium text-xs hover:opacity-95 transition-all shadow-md disabled:opacity-50"
                onClick={() => {
                  const ids = classrooms.map((c) => c.id);
                  generate.mutate({ classroom_ids: ids, discard_existing: true });
                }}
                disabled={generate.isPending}
              >
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                <span>Run Solver</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {slotId && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Plan Versions list */}
          <div className="lg:col-span-3 space-y-4">
            <h2 className="text-sm font-medium tracking-tight text-on-surface font-headline border-b border-outline-variant pb-2">Plan Versions</h2>
            
            {genJobId && <JobProgress jobId={genJobId} onDone={() => { setGenJobId(null); refetchPlans(); }} />}

            <div className="space-y-2.5">
              {plans.length === 0 && !genJobId && <p className="text-xs text-secondary italic">No plans generated yet. Click Run Solver.</p>}
              {plans.map((p) => {
                const isActive = planId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setPlanId(p.id)}
                    className={`
                      p-3 rounded-lg border cursor-pointer transition-all flex flex-col gap-2
                      ${isActive 
                        ? "bg-primary/10 border-primary ring-1 ring-primary/20 shadow-[0_0_15px_rgba(167,139,250,0.1)]" 
                        : "bg-surface-container border-outline-variant hover:border-outline hover:bg-surface-container-high"}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-mono font-bold ${isActive ? "text-primary" : "text-on-surface"}`}>v{p.version}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider ${
                          p.status === 'approved' ? 'bg-tertiary-container/40 text-tertiary' : 
                          p.status === 'preview' ? 'bg-primary/20 text-primary' : 
                          'bg-surface-container-highest text-secondary'
                        }`}>{p.status}</span>
                      </div>
                      {p.conflict_count > 0 && (
                        <div className="flex items-center gap-1 text-[10px] font-mono text-error">
                          <span className="material-symbols-outlined text-[12px]">warning</span>
                          {p.conflict_count}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-secondary">
                      {new Date(p.generated_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Plan Detail & Grid */}
          <div className="lg:col-span-9 space-y-5">
            {planDetail ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface-container-low border border-outline-variant rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-surface" style={{ fontSize: 16 }}>visibility</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-on-surface">Preview Matrix (v{planDetail.version})</h3>
                      <p className="text-[11px] text-secondary font-mono">{planDetail.assignments?.filter(a => a.student).length} Total Placements</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {selectedAssignments.length === 2 && (
                      <button 
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-highest hover:bg-surface-bright border border-outline-variant text-primary text-xs font-medium transition-colors shadow-sm" 
                        onClick={() => swap.mutate()} 
                        disabled={swap.isPending}
                      >
                        <span className="material-symbols-outlined text-[14px]">sync_alt</span>
                        <span>Confirm Swap</span>
                      </button>
                    )}
                    <a
                      href={`http://localhost:8000/api/exports/plans/${planId}/zip/`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface text-xs font-medium transition-colors shadow-sm"
                      target="_blank"
                    >
                      <span className="material-symbols-outlined text-[14px]">download</span>
                      <span>Export ZIP</span>
                    </a>
                    {planDetail.status !== "approved" && (
                      <button
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-tertiary text-on-tertiary font-semibold text-xs hover:opacity-90 transition-all shadow-md disabled:opacity-50"
                        onClick={() => approve.mutate()}
                        disabled={approve.isPending || (planDetail.conflict_count > 0 && !ackConflicts)}
                      >
                        <span className="material-symbols-outlined text-[14px]">task_alt</span>
                        <span>Approve</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Alerts */}
                {swapWarnings.length > 0 && (
                  <div className="bg-error-container/20 border border-error/30 rounded-xl p-4 flex gap-3 text-sm text-on-error-container">
                    <span className="material-symbols-outlined text-error mt-0.5">warning</span>
                    <div>
                      <strong className="block mb-1">Soft warnings after swap:</strong>
                      <ul className="list-disc pl-5 space-y-1 text-xs">
                        {swapWarnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                {planDetail.conflict_count > 0 && planDetail.status !== "approved" && (
                  <div className="bg-error-container/20 border border-error/30 rounded-xl p-4 flex gap-3 text-sm">
                    <span className="material-symbols-outlined text-error mt-0.5">error</span>
                    <div>
                      <strong className="block text-error mb-1.5">{planDetail.conflict_count} unresolved conflict(s) detected</strong>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface-variant hover:text-on-surface">
                        <input type="checkbox" className="rounded bg-surface-container border-outline-variant accent-error w-3.5 h-3.5" checked={ackConflicts} onChange={(e) => setAckConflicts(e.target.checked)} />
                        I acknowledge these conflicts and approve anyway
                      </label>
                    </div>
                  </div>
                )}

                {selectedAssignments.length > 0 && (
                  <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 flex items-center justify-between text-xs text-primary">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">info</span>
                      {selectedAssignments.length === 1 ? "Select a second seat to swap with." : "Click 'Confirm Swap' to proceed."}
                    </div>
                    <button className="text-secondary hover:text-on-surface underline decoration-dotted" onClick={() => setSelectedAssignments([])}>Cancel</button>
                  </div>
                )}

                {/* Invigilators */}
                {planDetail.invigilations && planDetail.invigilations.length > 0 && (
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
                    <h3 className="text-xs font-mono font-semibold text-secondary uppercase tracking-widest mb-3">Assigned Invigilators</h3>
                    <div className="flex flex-wrap gap-2">
                      {planDetail.invigilations.map((inv) => (
                        <div key={inv.id} className="flex items-center gap-2 bg-surface-container px-2.5 py-1.5 rounded-md border border-outline-variant text-xs text-on-surface">
                          <span className="material-symbols-outlined text-[14px] text-primary">person</span>
                          <span className="font-medium text-secondary">{inv.classroom_name}:</span>
                          <span>{inv.teacher_detail.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grids */}
                <div className="space-y-6">
                  {Object.entries(byClassroom).map(([clsId, asgns]) => {
                    const cls = classrooms.find((c) => c.id === Number(clsId));
                    const cols = cls?.layout_type_detail?.cols ?? 8;
                    return (
                      <div key={clsId} className="bg-surface-container/30 border border-outline-variant/60 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary text-[16px]">domain</span>
                            {cls?.name ?? `Classroom ${clsId}`}
                          </h4>
                          <span className="text-[11px] font-mono bg-surface-container-highest px-2 py-0.5 rounded text-secondary">
                            {asgns.filter((a) => a.student).length} / {asgns.length} Occupied
                          </span>
                        </div>
                        <SeatGrid
                          assignments={asgns}
                          cols={cols}
                          selectedIds={selectedAssignments}
                          onSelect={handleSelect}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 border border-dashed border-outline-variant rounded-xl text-secondary">
                <span className="material-symbols-outlined text-[48px] opacity-20 mb-3">grid_view</span>
                <p className="text-sm">Select a plan version to preview</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
