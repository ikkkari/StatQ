import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Users, ShieldCheck, UserCheck, UserX, AlertTriangle, RefreshCw, Filter, CheckCircle2, ShieldAlert } from 'lucide-react';

export const AdminUsersPage = () => {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [notification, setNotification] = useState(null);
  const [roleSelections, setRoleSelections] = useState({});

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminUsers(filter);
      setUsers(data);
      // Initialize default roles for pending users
      const initialRoles = {};
      data.forEach((u) => {
        if (u.status === 'PENDING') {
          initialRoles[u.id] = 'NURSE'; // sensible clinical default
        }
      });
      setRoleSelections((prev) => ({ ...initialRoles, ...prev }));
    } catch (err) {
      showNotification(err.message || 'Failed to load user accounts', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleApprove = async (userId) => {
    const role = roleSelections[userId] || 'NURSE';
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      const updated = await api.approveUser(userId, { role });
      showNotification(`Account ${updated.username} approved as ${updated.role}.`, 'success');
      fetchUsers();
    } catch (err) {
      showNotification(err.message || 'Approval failed', 'error');
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleReject = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to reject the registration request for "${username}"?`)) return;
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      await api.rejectUser(userId);
      showNotification(`Account ${username} rejected.`, 'info');
      fetchUsers();
    } catch (err) {
      showNotification(err.message || 'Rejection failed', 'error');
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleSuspend = async (userId, username) => {
    if (userId === currentAdmin?.id) {
      alert('You cannot suspend your own administrative account.');
      return;
    }
    if (!window.confirm(`Suspend account "${username}"? All active sessions will be immediately terminated.`)) return;
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      await api.suspendUser(userId);
      showNotification(`Account ${username} suspended.`, 'warning');
      fetchUsers();
    } catch (err) {
      showNotification(err.message || 'Suspension failed', 'error');
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const pendingCount = users.filter((u) => u.status === 'PENDING').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-700">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Staff Access & Approvals
                {pendingCount > 0 && (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                    {pendingCount} Pending Approval
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage emergency department user accounts, grant role permissions, and regulate system access.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls & Refresh */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-xl pl-8 pr-8 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="">All Accounts</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Active / Approved</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <button
            type="button"
            onClick={fetchUsers}
            disabled={isLoading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Floating Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : notification.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : notification.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-slate-50 text-slate-800 border-slate-200'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {notification.msg}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Username & Email</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No staff accounts found matching filter.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isPending = u.status === 'PENDING';
                  const isApproved = u.status === 'APPROVED';
                  const isSuspended = u.status === 'SUSPENDED';
                  const isSelf = u.id === currentAdmin?.id;

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isPending ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{u.full_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.id}</div>
                      </td>

                      {/* Username & Email */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-700 font-medium">{u.username}</div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {u.department || 'Emergency Department'}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            u.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : u.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : u.status === 'SUSPENDED'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>

                      {/* Role Column / Selection */}
                      <td className="py-3.5 px-4">
                        {isPending ? (
                          <select
                            value={roleSelections[u.id] || 'NURSE'}
                            onChange={(e) =>
                              setRoleSelections((prev) => ({
                                ...prev,
                                [u.id]: e.target.value,
                              }))
                            }
                            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                          >
                            <option value="NURSE">NURSE (Triage & Rooms)</option>
                            <option value="FRONT_DESK">FRONT_DESK (Registration)</option>
                            <option value="ADMIN">ADMIN (Full Control)</option>
                          </select>
                        ) : (
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            {u.role === 'ADMIN' && <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />}
                            {u.role}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(u.id)}
                                disabled={actionLoading[u.id]}
                                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50"
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(u.id, u.username)}
                                disabled={actionLoading[u.id]}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {isApproved && !isSelf && (
                            <button
                              type="button"
                              onClick={() => handleSuspend(u.id, u.username)}
                              disabled={actionLoading[u.id]}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-medium text-xs transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                            >
                              <UserX className="h-3.5 w-3.5" />
                              Suspend
                            </button>
                          )}

                          {isSuspended && (
                            <button
                              type="button"
                              onClick={() => handleApprove(u.id)}
                              disabled={actionLoading[u.id]}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Reactivate
                            </button>
                          )}

                          {isSelf && (
                            <span className="text-[11px] text-slate-400 font-medium italic">
                              Current Session
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
