"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Calendar, PlaneTakeoff, Plus, CheckCircle2, XCircle, History } from "lucide-react";

export default function ExecutivePathDashboard() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Typically, trips would have an ownerUid or assignedTo. Using ownerUid for MVP.
    const q = query(collection(db, "trips"), where("ownerUid", "==", user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTrips = [];
      snapshot.forEach(doc => {
        fetchedTrips.push({ id: doc.id, ...doc.data() });
      });
      setTrips(fetchedTrips);
      setLoading(false);
    }, (err) => {
      console.error("Trips sync error:", err);
      // For MVP without trips data yet, we just gracefully handle it
      setLoading(false); 
    });

    return () => unsubscribe();
  }, []);

  const activeTrips = trips.filter(t => t.status === "active").length;
  const completedTrips = trips.filter(t => t.status === "completed").length;
  const cancelledTrips = trips.filter(t => t.status === "cancelled").length;

  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-primary">Dashboard</h2>
          <p className="text-on-surface-variant mt-1">Overview of your upcoming trips and travel activity</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-surface-container border border-outline-variant text-on-surface px-4 py-2 rounded-lg font-semibold hover:bg-surface-container-high transition-colors shadow-sm">
            <Calendar className="w-4 h-4" /> View Itinerary
          </button>
          <button className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity shadow-sm">
            <Plus className="w-4 h-4" /> New Trip
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
        {/* Upcoming Trips */}
        <div className="md:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-primary inline-block"></span> 
              Upcoming Trips
            </h3>
            <div className="flex items-center gap-1 bg-surface-container rounded-lg p-0.5">
              <button className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-semibold text-xs shadow-sm">Month</button>
              <button className="px-3 py-1.5 rounded-lg text-on-surface-variant font-semibold text-xs hover:text-primary transition-colors">Week</button>
            </div>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <div className="h-32 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : trips.length > 0 ? (
              trips.map(trip => (
                <div key={trip.id} className="p-4 border border-outline-variant rounded-lg hover:border-primary/30 transition-colors">
                  <h4 className="font-bold text-primary">{trip.destination || "Unnamed Trip"}</h4>
                  <p className="text-sm text-on-surface-variant">{trip.date || "No date set"}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <PlaneTakeoff className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
                <p className="text-on-surface-variant font-medium">No upcoming trips scheduled</p>
                <button className="mt-4 text-primary font-semibold hover:underline text-sm">Create your first trip</button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="md:col-span-4 grid grid-rows-2 gap-6">
          <div className="bg-gradient-to-br from-teal-600 to-teal-800 text-white rounded-xl p-6 relative overflow-hidden shadow-lg">
            <div className="relative z-10">
              <span className="text-xs uppercase tracking-wider text-white/70 font-semibold">Total Trips</span>
              <p className="text-5xl font-bold mt-2">{trips.length}</p>
              <div className="mt-3 flex items-center gap-2 text-emerald-200">
                <PlaneTakeoff className="w-4 h-4" />
                <span className="text-xs font-semibold">{trips.length === 0 ? "No trips yet" : "All time"}</span>
              </div>
            </div>
            <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -left-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <span className="text-lg font-bold text-primary">Quick Stats</span>
              <span className="text-xs text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-lg font-semibold">{trips.length} total</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl p-4 text-white shadow-sm">
                <PlaneTakeoff className="w-4 h-4 text-white/80" />
                <p className="text-2xl font-bold mt-1">{activeTrips}</p>
                <p className="text-xs text-white/70 font-semibold">Active</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl p-4 text-white shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-white/80" />
                <p className="text-2xl font-bold mt-1">{completedTrips}</p>
                <p className="text-xs text-white/70 font-semibold">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Travel Calendar */}
        <div className="md:col-span-12 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-amber-500 inline-block"></span> 
              Travel Calendar
            </h3>
          </div>
          <div className="h-48 flex items-center justify-center border-2 border-dashed border-outline-variant rounded-xl">
            <p className="text-on-surface-variant/50 font-semibold">Calendar Component coming soon...</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="md:col-span-12 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm flex flex-col">
          <div className="p-6 border-b border-outline-variant">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-purple-500 inline-block"></span> 
              Recent Activity
            </h3>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="w-10 h-10 text-on-surface-variant/30 mb-3" />
            <p className="text-on-surface-variant font-medium">No recent activity</p>
          </div>
        </div>
      </div>
    </div>
  );
}
