"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import { 
  MonitorSmartphone, LifeBuoy, Wrench, CheckSquare, 
  Map, Ticket, History, Package, CheckCircle, Activity, Clock, BookOpen
} from "lucide-react";

function PlaceholderView({ title, icon }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="text-on-surface-variant/30 mb-4">{icon}</div>
      <h2 className="text-2xl font-bold text-primary">{title}</h2>
      <p className="text-on-surface-variant mt-2">This section is coming soon.</p>
    </div>
  );
}

export default function ExecutiveITDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "dashboard";

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Fetch IT Tickets
    const q = query(collection(db, "it_tickets"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTickets = [];
      snapshot.forEach(doc => {
        fetchedTickets.push({ id: doc.id, ...doc.data() });
      });
      setTickets(fetchedTickets);
      setLoading(false);
    }, () => { setLoading(false); });

    return () => unsubscribe();
  }, []);

  const openTicketsCount = tickets.filter(t => t.status === "open").length;

  if (view !== "dashboard") {
    const labels = {
      services: { title: "IT Services", icon: <LifeBuoy className="w-16 h-16" /> },
      maintenance: { title: "IT Maintenance", icon: <Wrench className="w-16 h-16" /> },
      inventory: { title: "IT Inventory", icon: <Package className="w-16 h-16" /> },
      task: { title: "Task", icon: <CheckSquare className="w-16 h-16" /> },
      planner: { title: "Plans & Roadmaps", icon: <Map className="w-16 h-16" /> },
      accomplishments: { title: "Daily Accomplishments", icon: <CheckCircle className="w-16 h-16" /> },
      tickets: { title: "Support Tickets", icon: <Ticket className="w-16 h-16" /> },
      systems: { title: "System Monitor", icon: <Activity className="w-16 h-16" /> },
      timetrack: { title: "Time Tracking", icon: <Clock className="w-16 h-16" /> },
      knowledge: { title: "Knowledge Base", icon: <BookOpen className="w-16 h-16" /> },
      auditlog: { title: "Audit Log", icon: <History className="w-16 h-16" /> },
    };
    const current = labels[view] || { title: view, icon: <Ticket className="w-16 h-16" /> };
    return <PlaceholderView title={current.title} icon={current.icon} />;
  }

  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-primary">Dashboard</h2>
          <p className="text-on-surface-variant mt-1">Overview of IT operations and system status</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 border border-outline-variant px-4 py-2 rounded-lg font-semibold text-on-surface-variant hover:bg-surface-container transition-colors shadow-sm">
            <MonitorSmartphone className="w-4 h-4" /> System Status
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {[
          { label: "IT Services", color: "from-teal-500 to-teal-700", icon: <LifeBuoy className="w-5 h-5" /> },
          { label: "Maintenance", color: "from-indigo-500 to-indigo-700", icon: <Wrench className="w-5 h-5" /> },
          { label: "Pending Tasks", color: "from-amber-500 to-amber-700", icon: <CheckSquare className="w-5 h-5" /> },
          { label: "Active Plans", color: "from-rose-500 to-rose-700", icon: <Map className="w-5 h-5" /> },
        ].map((s, i) => (
          <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm hover:-translate-y-1 transition-transform">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${s.color} text-white w-10 h-10 flex items-center justify-center mb-3`}>{s.icon}</div>
            <p className="text-3xl font-bold text-primary">0</p>
            <p className="text-sm font-semibold text-on-surface-variant mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Avg Resolution Time", value: "0h" },
          { label: "Open Tickets", value: openTicketsCount },
          { label: "Systems Online", value: "0" },
          { label: "Today Tracked", value: "0h" },
        ].map((k, i) => (
          <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-on-surface-variant">{k.label}</p>
            <p className="text-2xl font-bold text-primary mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
          <Ticket className="w-12 h-12 text-on-surface-variant/30 mb-4" />
          <p className="font-semibold text-on-surface-variant">Chart visualizer coming soon</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl flex flex-col shadow-sm">
          <div className="p-5 border-b border-outline-variant"><h3 className="font-bold text-primary">Recent Activity</h3></div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <History className="w-10 h-10 text-on-surface-variant/30 mb-3" />
            <p className="text-sm font-semibold text-on-surface-variant">No recent activity</p>
          </div>
        </div>
      </div>
    </div>
  );
}
