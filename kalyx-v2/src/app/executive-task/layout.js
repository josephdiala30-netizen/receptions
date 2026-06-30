"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { LayoutDashboard, CheckSquare, Settings, LogOut, Menu, X, User, ListTodo, Columns, Map, FileEdit, StickyNote, Plus } from "lucide-react";

export default function ExecutiveTaskLayout({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        try {
          const docSnap = await getDoc(doc(db, "profiles", user.uid));
          if (docSnap.exists()) {
            setProfile(docSnap.data());
          }
        } catch (err) {
          console.error("Failed to load profile:", err);
        }
        setLoading(false);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-surface-container-low text-on-surface font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-surface-container-lowest border-r border-outline-variant z-50 transform transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center justify-between mb-8 px-2">
            <div>
              <h1 className="text-xl font-bold text-primary">KALYX</h1>
              <p className="text-xs text-on-surface-variant">Executive Task</p>
            </div>
            <button className="md:hidden p-1 text-on-surface-variant hover:text-primary" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
            <a href="#" className="flex items-center gap-3 px-4 py-3 bg-primary text-on-primary font-semibold rounded-xl transition-all shadow-md">
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-on-surface-variant font-semibold rounded-xl hover:bg-surface-container-high hover:text-primary transition-all">
              <ListTodo className="w-5 h-5" />
              <span>All Tasks</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-on-surface-variant font-semibold rounded-xl hover:bg-surface-container-high hover:text-primary transition-all">
              <Columns className="w-5 h-5" />
              <span>Board</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-on-surface-variant font-semibold rounded-xl hover:bg-surface-container-high hover:text-primary transition-all">
              <Map className="w-5 h-5" />
              <span>Planner</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-on-surface-variant font-semibold rounded-xl hover:bg-surface-container-high hover:text-primary transition-all">
              <FileEdit className="w-5 h-5" />
              <span>Daily Log</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-on-surface-variant font-semibold rounded-xl hover:bg-surface-container-high hover:text-primary transition-all">
              <StickyNote className="w-5 h-5" />
              <span>Notes</span>
            </a>
          </nav>

          <div className="pt-4 border-t border-outline-variant">
            <div className="flex items-center gap-3 px-2 mb-4">
              <div className="w-10 h-10 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center font-bold">
                {profile?.name?.charAt(0).toUpperCase() || <User className="w-5 h-5" />}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate">{profile?.name || user.email}</p>
                <p className="text-xs text-on-surface-variant truncate capitalize">{profile?.role || "User"}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-error bg-error-container/30 hover:bg-error-container rounded-xl transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center px-4 bg-surface-container-lowest border-b border-outline-variant md:hidden">
          <button className="p-2 -ml-2 text-on-surface hover:text-primary" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <span className="ml-2 font-bold text-lg text-primary">KALYX</span>
        </header>
        
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
