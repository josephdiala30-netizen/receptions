"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { 
  MonitorSmartphone, LifeBuoy, Wrench, CheckSquare, 
  Map, Ticket, History, Plus 
} from "lucide-react";

export default function ExecutiveITDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

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
    }, (err) => {
      console.error("Tickets sync error:", err);
      setLoading(false); 
    });

    return () => unsubscribe();
  }, []);

  const openTicketsCount = tickets.filter(t => t.status === "open").length;

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

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm hover:-translate-y-1 transition-transform">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white w-10 h-10 flex items-center justify-center mb-3">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold text-primary">0</p>
          <p className="text-sm font-semibold text-on-surface-variant mt-1">IT Services</p>
        </div>
        
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm hover:-translate-y-1 transition-transform">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white w-10 h-10 flex items-center justify-center mb-3">
            <Wrench className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold text-primary">0</p>
          <p className="text-sm font-semibold text-on-surface-variant mt-1">Maintenance</p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm hover:-translate-y-1 transition-transform">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white w-10 h-10 flex items-center justify-center mb-3">
            <CheckSquare className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold text-primary">0</p>
          <p className="text-sm font-semibold text-on-surface-variant mt-1">Pending Tasks</p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm hover:-translate-y-1 transition-transform">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 text-white w-10 h-10 flex items-center justify-center mb-3">
            <Map className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold text-primary">0</p>
          <p className="text-sm font-semibold text-on-surface-variant mt-1">Active Plans</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-on-surface-variant">Avg Resolution Time</p>
          <p className="text-2xl font-bold text-primary mt-1">0h</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-on-surface-variant">Open Tickets</p>
          <p className="text-2xl font-bold text-primary mt-1">{openTicketsCount}</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-on-surface-variant">Systems Online</p>
          <p className="text-2xl font-bold text-primary mt-1">0</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-on-surface-variant">Today Tracked</p>
          <p className="text-2xl font-bold text-primary mt-1">0h</p>
        </div>
      </div>

      {/* Charts Placeholder & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
           <Ticket className="w-12 h-12 text-on-surface-variant/30 mb-4" />
           <p className="font-semibold text-on-surface-variant">Chart visualizer coming soon (Next.js Recharts)</p>
        </div>
        
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl flex flex-col shadow-sm">
          <div className="p-5 border-b border-outline-variant">
            <h3 className="font-bold text-primary">Recent Activity</h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <History className="w-10 h-10 text-on-surface-variant/30 mb-3" />
            <p className="text-sm font-semibold text-on-surface-variant">No recent activity</p>
          </div>
        </div>
      </div>
    </div>
  );
}
