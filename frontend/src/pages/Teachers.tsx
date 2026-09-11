import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import type { Teacher } from "../api/types";

export default function Teachers() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Teacher | undefined>();
  const [form, setForm] = useState({ name: "", email: "", department: "" });

  const { data: teachers = [], isLoading } = useQuery<Teacher[]>({
    queryKey: ["teachers"],
    queryFn: () => api.get("/teachers/").then((r) => r.data.results ?? r.data),
  });

  const openAdd = () => { setEditing(undefined); setForm({ name: "", email: "", department: "" }); setShowModal(true); };
  const openEdit = (t: Teacher) => { setEditing(t); setForm({ name: t.name, email: t.email, department: t.department }); setShowModal(true); };

  const save = useMutation({
    mutationFn: () =>
      editing ? api.patch(`/teachers/${editing.id}/`, form) : api.post("/teachers/", form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["teachers"] }); setShowModal(false); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/teachers/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teachers"] }),
  });

  return (
    <div className="flex flex-col w-full pb-14 gap-8">
      <div className="relative w-full">
        <div className="absolute -top-16 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pt-2">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-widest bg-surface-container-high text-primary font-semibold">Personnel</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-on-surface font-headline">Faculty & Invigilators</h1>
            <p className="text-sm text-on-surface-variant max-w-xl leading-relaxed">Manage staff profiles, departments, and unavailabilities.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary font-medium text-xs hover:opacity-95 transition-all shadow-md" onClick={openAdd}>
              <span className="material-symbols-outlined text-[17px]">person_add</span>
              <span>New Teacher</span>
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 justify-center h-32">
          <div className="w-6 h-6 border-2 border-surface-container-highest border-t-primary rounded-full animate-spin" />
          <span className="text-on-surface-variant text-sm font-mono">Loading records...</span>
        </div>
      ) : (
        <div className="rounded-xl border border-outline-variant bg-surface-container/30 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-outline-variant">
                <th className="px-5 py-3 text-[11px] font-mono font-semibold text-secondary uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 text-[11px] font-mono font-semibold text-secondary uppercase tracking-wider">Department</th>
                <th className="px-5 py-3 text-[11px] font-mono font-semibold text-secondary uppercase tracking-wider">Email</th>
                <th className="px-5 py-3 text-[11px] font-mono font-semibold text-secondary uppercase tracking-wider">Upcoming Leaves</th>
                <th className="px-5 py-3 text-[11px] font-mono font-semibold text-secondary uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {teachers.map((t) => (
                <tr key={t.id} className="hover:bg-surface-container-high/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant">
                        <span className="material-symbols-outlined text-primary text-[16px]">person</span>
                      </div>
                      <span className="font-medium text-sm text-on-surface">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-on-surface-variant">{t.department}</td>
                  <td className="px-5 py-3.5 text-sm text-secondary font-mono">{t.email}</td>
                  <td className="px-5 py-3.5">
                    {t.unavailabilities.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {t.unavailabilities.slice(0, 3).map((u) => (
                          <span key={u.id} className="px-2 py-0.5 rounded text-[10px] font-mono bg-error-container/30 text-error border border-error/20">
                            {u.date}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-secondary italic">None</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        className="w-7 h-7 rounded bg-surface-container-highest text-secondary hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-colors"
                        onClick={() => openEdit(t)}
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                      </button>
                      <button 
                        className="w-7 h-7 rounded bg-surface-container-highest text-secondary hover:text-error hover:bg-error/10 flex items-center justify-center transition-colors"
                        onClick={() => { if (confirm("Delete teacher?")) del.mutate(t.id); }}
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-on-surface-variant text-sm">
                    No teachers registered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-surface-container border border-outline-variant rounded-xl p-7 min-w-[400px] max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-headline font-semibold text-on-surface mb-5">
              {editing ? "Edit Teacher" : "Add Teacher"}
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono tracking-widest text-on-surface-variant uppercase">Name</label>
                <input 
                  className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full" 
                  value={form.name} 
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono tracking-widest text-on-surface-variant uppercase">Department</label>
                <input 
                  className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full" 
                  value={form.department} 
                  onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono tracking-widest text-on-surface-variant uppercase">Email</label>
                <input 
                  type="email"
                  className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full" 
                  value={form.email} 
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} 
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors" onClick={() => setShowModal(false)}>Cancel</button>
              <button 
                className="px-4 py-2 rounded-lg bg-primary text-on-primary font-medium text-xs hover:opacity-90 transition-all shadow-md disabled:opacity-50" 
                onClick={() => save.mutate()} 
                disabled={save.isPending || !form.name || !form.email}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
