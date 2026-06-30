"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import { Users, CheckSquare, Map, PlaneTakeoff, ShieldAlert, FileEdit, Database, Search } from "lucide-react";

function PlaceholderView({ title, icon }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="text-on-surface-variant/30 mb-4">{icon}</div>
      <h2 className="text-2xl font-bold text-primary">{title}</h2>
      <p className="text-on-surface-variant mt-2">This section is coming soon.</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, tasks: 0, plans: 0, trips: 0 });
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "dashboard";

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Listen to Profiles for users count and recent users list
    const unsubProfiles = onSnapshot(collection(db, "profiles"), (snapshot) => {
      setStats(prev => ({ ...prev, users: snapshot.size }));
      
      const users = [];
      snapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
      });
      // Sort by creation or just take top 5
      setRecentUsers(users.slice(0, 5));
    });

    // Listen to Shared Tasks for tasks count
    const unsubTasks = onSnapshot(collection(db, "shared_tasks"), (snapshot) => {
      setStats(prev => ({ ...prev, tasks: snapshot.size }));
    });

    // Listen to Trips for trips count
    const unsubTrips = onSnapshot(collection(db, "trips"), (snapshot) => {
      setStats(prev => ({ ...prev, trips: snapshot.size }));
    });

    // Assume plans collection exists for plans count
    const unsubPlans = onSnapshot(collection(db, "plans"), (snapshot) => {
      setStats(prev => ({ ...prev, plans: snapshot.size }));
    });
    
    setLoading(false);

    return () => {
      unsubProfiles();
      unsubTasks();
      unsubTrips();
      unsubPlans();
    };
  }, []);

  if (view !== "dashboard") {
    const viewMap = {
      users: { title: "Users", icon: <Users className="w-16 h-16" /> },
      tasks: { title: "Tasks", icon: <CheckSquare className="w-16 h-16" /> },
      plans: { title: "Plans & Roadmaps", icon: <Map className="w-16 h-16" /> },
      "daily-logs": { title: "Daily Logs", icon: <FileEdit className="w-16 h-16" /> },
      trips: { title: "Trips", icon: <PlaneTakeoff className="w-16 h-16" /> },
      data: { title: "Data Management", icon: <Database className="w-16 h-16" /> },
      search: { title: "Global Search", icon: <Search className="w-16 h-16" /> },
    };
    const current = viewMap[view] || { title: view, icon: <ShieldAlert className="w-16 h-16" /> };
    return <PlaceholderView title={current.title} icon={current.icon} />;
  }


  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-primary">System Overview</h2>
        <p className="text-on-surface-variant mt-1 text-lg">Complete oversight of all modules and accounts</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl p-6 relative overflow-hidden shadow-lg hover:-translate-y-1 transition-transform">
          <div className="relative z-10">
            <span className="text-xs uppercase tracking-wider text-white/70 font-semibold">Total Users</span>
            <p className="text-5xl font-bold mt-2">{stats.users}</p>
          </div>
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          <Users className="absolute top-6 right-6 w-12 h-12 text-white/20" />
        </div>
        
        <div className="bg-gradient-to-br from-amber-500 to-amber-700 text-white rounded-2xl p-6 relative overflow-hidden shadow-lg hover:-translate-y-1 transition-transform">
          <div className="relative z-10">
            <span className="text-xs uppercase tracking-wider text-white/70 font-semibold">Total Tasks</span>
            <p className="text-5xl font-bold mt-2">{stats.tasks}</p>
          </div>
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          <CheckSquare className="absolute top-6 right-6 w-12 h-12 text-white/20" />
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl p-6 relative overflow-hidden shadow-lg hover:-translate-y-1 transition-transform">
          <div className="relative z-10">
            <span className="text-xs uppercase tracking-wider text-white/70 font-semibold">Total Plans</span>
            <p className="text-5xl font-bold mt-2">{stats.plans}</p>
          </div>
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          <Map className="absolute top-6 right-6 w-12 h-12 text-white/20" />
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-rose-700 text-white rounded-2xl p-6 relative overflow-hidden shadow-lg hover:-translate-y-1 transition-transform">
          <div className="relative z-10">
            <span className="text-xs uppercase tracking-wider text-white/70 font-semibold">Total Trips</span>
            <p className="text-5xl font-bold mt-2">{stats.trips}</p>
          </div>
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          <PlaneTakeoff className="absolute top-6 right-6 w-12 h-12 text-white/20" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Users Table */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" /> Recent Accounts
            </h3>
            <button className="text-sm font-semibold text-primary hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {recentUsers.map((u, i) => (
                  <tr key={i} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
                          {u.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="font-semibold text-primary">{u.name || "Unknown"}</p>
                          <p className="text-xs text-on-surface-variant">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-bold rounded-md bg-secondary-container text-on-secondary-container">
                        {u.role || "User"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-bold rounded-md bg-emerald-100 text-emerald-700">Active</span>
                    </td>
                  </tr>
                ))}
                {recentUsers.length === 0 && !loading && (
                  <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-on-surface-variant font-semibold">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* System Health */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm flex flex-col">
          <div className="p-6 border-b border-outline-variant">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-emerald-500" /> System Health
            </h3>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-sm">Firestore Database</span>
                <span className="text-emerald-500 text-xs font-bold">Connected</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{width: '100%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-sm">Auth Services</span>
                <span className="text-emerald-500 text-xs font-bold">Online</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{width: '100%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-sm">Next.js Edge</span>
                <span className="text-emerald-500 text-xs font-bold">Optimal</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{width: '100%'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
