import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import type { Classroom, LayoutType } from "../api/types";

function ClassroomModal({
  layouts,
  initial,
  onClose,
  onSave,
}: {
  layouts: LayoutType[];
  initial?: Classroom;
  onClose: () => void;
  onSave: (data: { name: string; layout_type: number }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [layoutId, setLayoutId] = useState<number>(initial?.layout_type ?? layouts[0]?.id);

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-container border border-outline-variant rounded-xl p-7 min-w-[400px] max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-headline font-semibold text-on-surface mb-5">
          {initial ? "Edit Classroom" : "Add Classroom"}
        </div>
        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-[11px] font-mono tracking-widest text-on-surface-variant uppercase">Name</label>
          <input 
            className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all w-full" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="e.g. Hall 301" 
          />
        </div>
        <div className="flex flex-col gap-1.5 mb-6">
          <label className="text-[11px] font-mono tracking-widest text-on-surface-variant uppercase">Layout Type</label>
          <select 
            className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all w-full appearance-none" 
            value={layoutId} 
            onChange={(e) => setLayoutId(Number(e.target.value))}
          >
            {layouts.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({l.capacity} seats)</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors" onClick={onClose}>Cancel</button>
          <button 
            className="px-4 py-2 rounded-lg bg-primary text-on-primary font-medium text-xs hover:opacity-90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed" 
            onClick={() => onSave({ name, layout_type: layoutId })} 
            disabled={!name || !layoutId}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Classrooms() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Classroom | undefined>();

  const { data: classrooms = [], isLoading } = useQuery<Classroom[]>({
    queryKey: ["classrooms"],
    queryFn: () => api.get("/classrooms/").then((r) => r.data.results ?? r.data),
  });

  const { data: layouts = [] } = useQuery<LayoutType[]>({
    queryKey: ["layout-types"],
    queryFn: () => api.get("/classrooms/layout-types/").then((r) => r.data.results ?? r.data),
  });

  const save = useMutation({
    mutationFn: (data: { name: string; layout_type: number }) =>
      editing
        ? api.patch(`/classrooms/${editing.id}/`, data)
        : api.post("/classrooms/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["classrooms"] }); setShowModal(false); setEditing(undefined); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/classrooms/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classrooms"] }),
  });

  return (
    <div className="flex flex-col w-full pb-14 gap-8">
      {/* Subtle Ambient Glow Behind Canvas */}
      <div className="relative w-full">
        <div className="absolute -top-16 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="absolute top-48 right-10 w-80 h-80 bg-tertiary/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
        
        {/* Header & Action Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pt-2">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-widest bg-surface-container-high text-primary font-semibold">Campus Infrastructure</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-on-surface font-headline">Classrooms & Venues</h1>
            <p className="text-sm text-on-surface-variant max-w-xl leading-relaxed">Configure examination halls, spatial distances, and layouts.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary font-medium text-xs hover:opacity-95 transition-all shadow-md" onClick={() => { setEditing(undefined); setShowModal(true); }}>
              <span className="material-symbols-outlined text-[17px]">add</span>
              <span>New Classroom</span>
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 justify-center h-32">
          <div className="w-6 h-6 border-2 border-surface-container-highest border-t-primary rounded-full animate-spin" />
          <span className="text-on-surface-variant text-sm font-mono">Loading venues...</span>
        </div>
      ) : (
        <div className="rounded-xl border border-outline-variant bg-surface-container/30 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-outline-variant">
                <th className="px-5 py-3 text-[11px] font-mono font-semibold text-secondary uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 text-[11px] font-mono font-semibold text-secondary uppercase tracking-wider">Layout</th>
                <th className="px-5 py-3 text-[11px] font-mono font-semibold text-secondary uppercase tracking-wider">Shape</th>
                <th className="px-5 py-3 text-[11px] font-mono font-semibold text-secondary uppercase tracking-wider">Capacity</th>
                <th className="px-5 py-3 text-[11px] font-mono font-semibold text-secondary uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {classrooms.map((c) => (
                <tr key={c.id} className="hover:bg-surface-container-high/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-surface-container-highest flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>domain</span>
                      </div>
                      <span className="font-medium text-sm text-on-surface">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-on-surface-variant">{c.layout_type_detail?.name}</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-container-highest text-secondary uppercase tracking-wider">
                      {c.layout_type_detail?.shape}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-on-surface font-mono">{c.capacity}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        className="w-7 h-7 rounded bg-surface-container-highest text-secondary hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-colors"
                        onClick={() => { setEditing(c); setShowModal(true); }}
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                      </button>
                      <button 
                        className="w-7 h-7 rounded bg-surface-container-highest text-secondary hover:text-error hover:bg-error/10 flex items-center justify-center transition-colors"
                        onClick={() => { if (confirm("Delete this classroom?")) del.mutate(c.id); }}
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {classrooms.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-on-surface-variant text-sm">
                    No classrooms found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ClassroomModal
          layouts={layouts}
          initial={editing}
          onClose={() => { setShowModal(false); setEditing(undefined); }}
          onSave={(data) => save.mutate(data)}
        />
      )}
    </div>
  );
}
