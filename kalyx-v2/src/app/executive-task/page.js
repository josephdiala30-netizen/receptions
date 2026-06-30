"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Loader2, Plus, Clock, CheckCircle2, Circle, AlertCircle } from "lucide-react";

export default function ExecutiveTaskBoard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "shared_tasks"),
      where("assignedToUid", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedTasks.push({
          id: docSnap.id,
          ...data.task,
          status: data.status || "todo",
          assignedBy: data.assignedByUsername
        });
      });
      setTasks(fetchedTasks);
      setLoading(false);
    }, (err) => {
      console.error("Task sync error:", err);
      setError("Failed to sync tasks.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const taskRef = doc(db, "shared_tasks", taskId);
      await updateDoc(taskRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error updating task status:", err);
      alert("Failed to update task status.");
    }
  };

  const onDragStart = (e, taskId) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const onDrop = (e, status) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      updateTaskStatus(taskId, status);
    }
  };

  const allowDrop = (e) => {
    e.preventDefault();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const columns = [
    { id: "todo", title: "To Do", icon: <Circle className="w-5 h-5 text-on-surface-variant" /> },
    { id: "in_progress", title: "In Progress", icon: <Clock className="w-5 h-5 text-amber-500" /> },
    { id: "done", title: "Done", icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" /> }
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-primary">My Tasks</h2>
          <p className="text-sm text-on-surface-variant">Manage tasks assigned to you.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl font-semibold hover:opacity-90 shadow-sm transition-all active:scale-95">
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-error-container text-on-error-container p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
        {columns.map(col => (
          <div 
            key={col.id} 
            className="flex flex-col bg-surface-container rounded-2xl p-4 overflow-hidden shadow-sm"
            onDragOver={allowDrop}
            onDrop={(e) => onDrop(e, col.id)}
          >
            <div className="flex items-center gap-2 mb-4 px-2">
              {col.icon}
              <h3 className="font-semibold text-lg">{col.title}</h3>
              <span className="ml-auto bg-surface-container-high text-on-surface-variant text-xs font-bold px-2 py-1 rounded-full">
                {tasks.filter(t => t.status === col.id).length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 pb-4">
              {tasks.filter(t => t.status === col.id).map(task => (
                <div 
                  key={task.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, task.id)}
                  className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/30 hover:shadow-md transition-all animate-fade-in group"
                >
                  <h4 className="font-bold text-base mb-1 group-hover:text-primary transition-colors">{task.title || "Untitled Task"}</h4>
                  {task.desc && <p className="text-sm text-on-surface-variant line-clamp-2 mb-3">{task.desc}</p>}
                  
                  <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-outline-variant/50">
                    <span className="font-medium bg-secondary-container text-on-secondary-container px-2 py-1 rounded-md">
                      {task.priority || "Medium"}
                    </span>
                    {task.assignedBy && (
                      <span className="text-on-surface-variant font-medium">
                        From: {task.assignedBy}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {tasks.filter(t => t.status === col.id).length === 0 && (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-outline-variant rounded-xl">
                  <p className="text-sm font-semibold text-on-surface-variant/50">Drop tasks here</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
