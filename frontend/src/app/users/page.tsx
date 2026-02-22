"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Shield,
  Crown,
  Eye,
  Trash2,
  ChevronDown,
  Mail,
  Building2,
  Clock,
  Search,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import GlassCard from "@/components/ui/GlassCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Modal from "@/components/ui/Modal";
import AuthGuard from "@/components/layout/AuthGuard";
import { useAuth } from "@/lib/auth-context";
import { listUsers, updateUserRole, deleteUser, type UserData } from "@/lib/api";

const ROLE_CONFIG: Record<string, { color: string; icon: typeof Shield; label: string }> = {
  admin: { color: "text-red-400 bg-red-500/10 border-red-500/20", icon: Crown, label: "Admin" },
  compliance_officer: { color: "text-purple-400 bg-purple-500/10 border-purple-500/20", icon: Shield, label: "Compliance Officer" },
  analyst: { color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: Shield, label: "Analyst" },
  viewer: { color: "text-green-400 bg-green-500/10 border-green-500/20", icon: Eye, label: "Viewer" },
};

export default function UsersPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await listUsers();
      setUsers(res.data);
    } catch (err: any) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      console.error("Role update failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setActionLoading(userToDelete._id);
    try {
      await deleteUser(userToDelete._id);
      setUsers((prev) => prev.filter((u) => u._id !== userToDelete._id));
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.organization?.toLowerCase() ?? "").includes(search.toLowerCase())
  );

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    officers: users.filter((u) => u.role === "compliance_officer" || u.role === "analyst").length,
    viewers: users.filter((u) => u.role === "viewer").length,
  };

  if (!isAdmin) {
    return (
      <AuthGuard>
      <div className="min-h-screen bg-[var(--bg)] flex">
        <Sidebar />
        <div className="flex-1 ml-[240px]">
          <Topbar />
          <main className="p-6 flex items-center justify-center min-h-[80vh]">
            <GlassCard className="text-center max-w-md">
              <Shield size={48} className="text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Access Required</h2>
              <p className="text-gray-400 text-sm">
                You need administrator privileges to view user management.
                Contact your admin to upgrade your role.
              </p>
            </GlassCard>
          </main>
        </div>
      </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
    <div className="min-h-screen bg-[var(--bg)] flex">
      <Sidebar />
      <div className="flex-1 ml-[240px]">
        <Topbar />
        <main className="p-6 space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Users size={24} className="text-blue-400" />
              User Management
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              View and manage all registered users, roles, and access levels.
            </p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total Users", value: stats.total, color: "from-blue-500 to-cyan-400" },
              { label: "Admins", value: stats.admins, color: "from-red-500 to-rose-400" },
              { label: "Officers", value: stats.officers, color: "from-purple-500 to-pink-400" },
              { label: "Viewers", value: stats.viewers, color: "from-green-500 to-emerald-400" },
            ].map((s, i) => (
              <GlassCard key={s.label}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                  <p
                    className={`text-3xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}
                  >
                    {s.value}
                  </p>
                </motion.div>
              </GlassCard>
            ))}
          </div>

          {/* Search */}
          <GlassCard>
            <div className="flex items-center gap-3">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name, email, or organization..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="glass-input flex-1 px-3 py-2 text-sm"
              />
              <span className="text-xs text-gray-400">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
              </span>
            </div>
          </GlassCard>

          {/* User List */}
          {loading ? (
            <LoadingSpinner />
          ) : filteredUsers.length === 0 ? (
            <GlassCard className="text-center py-12">
              <Users size={40} className="text-white/15 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No users found</p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u, i) => {
                const roleConf = ROLE_CONFIG[u.role] || ROLE_CONFIG.viewer;
                const RoleIcon = roleConf.icon;
                const isCurrentUser = u._id === currentUser?._id;
                return (
                  <motion.div
                    key={u._id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <GlassCard className="!p-4">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {u.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-white truncate">
                              {u.name}
                            </h3>
                            {isCurrentUser && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Mail size={10} /> {u.email}
                            </span>
                            {u.organization && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Building2 size={10} /> {u.organization}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Role badge */}
                        <div
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${roleConf.color}`}
                        >
                          <RoleIcon size={12} />
                          {roleConf.label}
                        </div>

                        {/* Timestamps */}
                        <div className="text-right shrink-0 hidden xl:block">
                          <p className="text-[10px] text-gray-400 flex items-center gap-1 justify-end">
                            <Clock size={9} /> Joined{" "}
                            {u.created_at
                              ? new Date(u.created_at).toLocaleDateString()
                              : "—"}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Last login:{" "}
                            {u.last_login
                              ? new Date(u.last_login).toLocaleDateString()
                              : "Never"}
                          </p>
                        </div>

                        {/* Actions */}
                        {!isCurrentUser && (
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Role dropdown */}
                            <div className="relative group">
                              <button className="glass-button !py-1.5 !px-3 text-xs flex items-center gap-1">
                                Role <ChevronDown size={12} />
                              </button>
                              <div className="absolute right-0 top-full mt-1 w-36 glass-card !p-1 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                {["admin", "compliance_officer", "analyst", "viewer"].map((r) => (
                                  <button
                                    key={r}
                                    onClick={() => handleRoleChange(u._id, r)}
                                    disabled={actionLoading === u._id}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-white/5 transition-colors ${
                                      u.role === r
                                        ? "text-blue-400 font-medium"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {r.charAt(0).toUpperCase() + r.slice(1)}
                                    {u.role === r && " ✓"}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Delete */}
                            <motion.button
                              onClick={() => {
                                setUserToDelete(u);
                                setShowDeleteModal(true);
                              }}
                              className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Trash2 size={14} />
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setUserToDelete(null);
        }}
        title="Delete User"
      >
        <div className="space-y-4">
          <p className="text-gray-500 text-sm">
            Are you sure you want to delete{" "}
            <span className="font-medium">{userToDelete?.name}</span>{" "}
            ({userToDelete?.email})? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setUserToDelete(null);
              }}
              className="glass-button !py-2 !px-4 text-sm"
            >
              Cancel
            </button>
            <motion.button
              onClick={handleDelete}
              disabled={actionLoading === userToDelete?._id}
              className="py-2 px-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {actionLoading === userToDelete?._id ? "Deleting..." : "Delete User"}
            </motion.button>
          </div>
        </div>
      </Modal>
    </div>
    </AuthGuard>
  );
}
