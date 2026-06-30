"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import { 
  Loader2, Plus, Clock, CheckCircle2, Circle, AlertCircle,
  ListTodo, LayoutDashboard, Columns, Map, FileEdit, StickyNote
} from "lucide-react";

function DashboardView({ tasks }) {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === "done").length;
  const inProgress = tasks.filter(t => t.status === "in_progress").length;
  const todo = tasks.filter(t => t.status === "todo").length;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-primary">Dashboard</h2>
        <p className="text-on-surface-variant text-sm mt-1">Your task overview</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Tasks", value: total, color: "from-indigo-500 to-indigo-700" },
          { label: "To Do", value: todo, color: "from-slate-500 to-slate-700" },
          { label: "In Progress", value: inProgress, color: "from-amber-500 to-amber-700" },
          { label: "Done", value: done, color: "from-emerald-500 to-emerald-700" },
        ].map((s, i) => (
          <div key={i} className={`bg-gradient-to-br ${s.color} text-white rounded-2xl p-5 shadow-lg`}>
            <p className="text-4xl font-bold">{s.value}</p>
            <p className="text-xs text-white/70 font-semibold mt-1 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6">
        <h3 className="font-bold text-primary mb-4">Recent Tasks</h3>
        <div className="space-y-3">
          {tasks.slice(0, 5).map(task => (
            <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container transition-colors">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === "done" ? "bg-emerald-500" : task.status === "in_progress" ? "bg-amber-500" : "bg-slate-400"}`}></div>
              <p className="font-semibold text-sm flex-1 truncate">{task.title || "Untitled Task"}</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${task.status === "done" ? "bg-emerald-100 text-emerald-700" : task.status === "in_progress" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>{task.status}</span>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-on-surface-variant text-sm text-center py-6">No tasks yet</p>}
        </div>
      </div>
    </div>
  );
}

function BoardView({ tasks, onUpdateStatus }) {
  const columns = [
    { id: "todo", title: "To Do", icon: <Circle className="w-5 h-5 text-slate-400" /> },
    { id: "in_progress", title: "In Progress", icon: <Clock className="w-5 h-5 text-amber-500" /> },
    { id: "done", title: "Done", icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" /> }
  ];
  return (
    <div>
      <div className="mb-8"><h2 className="text-2xl font-bold text-primary">Board</h2><p className="text-sm text-on-surface-variant mt-1">Drag tasks between columns</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(col => (
          <div key={col.id} className="bg-surface-container rounded-2xl p-4"
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData("taskId"); if (id) onUpdateStatus(id, col.id); }}>
            <div className="flex items-center gap-2 mb-4 px-2">
              {col.icon}
              <h3 className="font-semibold text-lg">{col.title}</h3>
              <span className="ml-auto bg-surface-container-high text-on-surface-variant text-xs font-bold px-2 py-1 rounded-full">
                {tasks.filter(t => t.status === col.id).length}
              </span>
            </div>
            <div className="space-y-3 min-h-[80px]">
              {tasks.filter(t => t.status === col.id).map(task => (
                <div key={task.id} draggable onDragStart={e => e.dataTransfer.setData("taskId", task.id)}
                  className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/30 hover:shadow-md transition-all">
                  <h4 className="font-bold text-sm mb-1 hover:text-primary">{task.title || "Untitled"}</h4>
                  {task.desc && <p className="text-xs text-on-surface-variant line-clamp-2 mb-2">{task.desc}</p>}
                  <span className="text-xs font-bold bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-md">{task.priority || "Medium"}</span>
                </div>
              ))}
              {tasks.filter(t => t.status === col.id).length === 0 && (
                <div className="border-2 border-dashed border-outline-variant rounded-xl h-16 flex items-center justify-center">
                  <p className="text-xs text-on-surface-variant/40 font-semibold">Drop here</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AllTasksView({ tasks, onUpdateStatus }) {
  return (
    <div>
      <div className="mb-8"><h2 className="text-2xl font-bold text-primary">All Tasks</h2><p className="text-sm text-on-surface-variant mt-1">Full list of assigned tasks</p></div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-3">Task</th>
              <th className="px-6 py-3">Priority</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Assigned By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {tasks.map(task => (
              <tr key={task.id} className="hover:bg-surface-container-low transition-colors">
                <td className="px-6 py-4 font-semibold">{task.title || "Untitled Task"}</td>
                <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-bold rounded-md bg-secondary-container text-on-secondary-container">{task.priority || "Medium"}</span></td>
                <td className="px-6 py-4">
                  <select className="text-xs font-bold bg-transparent border border-outline-variant rounded-lg px-2 py-1 focus:outline-none"
                    value={task.status || "todo"} onChange={e => onUpdateStatus(task.id, e.target.value)}>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-on-surface-variant">{task.assignedBy || "—"}</td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr><td colSpan="4" className="px-6 py-10 text-center text-on-surface-variant">No tasks assigned to you</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlaceholderView({ title, icon }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="text-on-surface-variant/30 mb-4">{icon}</div>
      <h2 className="text-2xl font-bold text-primary">{title}</h2>
      <p className="text-on-surface-variant mt-2">This section is coming soon.</p>
    </div>
  );
}

export default function ExecutiveTaskBoard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "dashboard";

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    const q = query(collection(db, "shared_tasks"), where("assignedToUid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        fetched.push({ id: docSnap.id, ...data.task, status: data.status || "todo", assignedBy: data.assignedByUsername });
      });
      setTasks(fetched);
      setLoading(false);
    }, (err) => { setError("Failed to sync tasks."); setLoading(false); });

    return () => unsubscribe();
  }, []);

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await updateDoc(doc(db, "shared_tasks", taskId), { status: newStatus, updatedAt: new Date().toISOString() });
    } catch (err) { alert("Failed to update task status."); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="bg-error-container text-on-error-container p-4 rounded-xl flex items-center gap-3">
      <AlertCircle className="w-5 h-5" /><p className="text-sm font-semibold">{error}</p>
    </div>
  );

  switch (view) {
    case "board": return <BoardView tasks={tasks} onUpdateStatus={updateTaskStatus} />;
    case "all-tasks": return <AllTasksView tasks={tasks} onUpdateStatus={updateTaskStatus} />;
    case "planner": return <PlaceholderView title="Planner" icon={<Map className="w-16 h-16" />} />;
    case "daily-log": return <PlaceholderView title="Daily Log" icon={<FileEdit className="w-16 h-16" />} />;
    case "notes": return <PlaceholderView title="Notes" icon={<StickyNote className="w-16 h-16" />} />;
    default: return <DashboardView tasks={tasks} />;
  }
}
