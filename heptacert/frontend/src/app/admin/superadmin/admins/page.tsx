"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Search,
  Shield,
} from "lucide-react";
import {
  listSuperAdmins,
  createSuperAdmin,
  deleteSuperAdmin,
  updateSuperAdminRole,
  AdminOut,
} from "@/lib/api";
import PageHeader from "@/components/Admin/PageHeader";
import ConfirmModal from "@/components/Admin/ConfirmModal";

export default function SuperAdminAdminsPage() {
  const router = useRouter();

  const [admins, setAdmins] = useState<AdminOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<"superadmin" | "admin">("admin");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingRole, setEditingRole] = useState<"superadmin" | "admin" | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setError(null);
      const data = await listSuperAdmins();
      setAdmins(data);
    } catch (e: any) {
      console.error("Failed to load admins:", e);
      setError(e?.message || "Yöneticiler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newAdminEmail.trim()) {
      setError("Email gerekli");
      return;
    }

    try {
      setCreating(true);
      setError(null);
      await createSuperAdmin({ email: newAdminEmail, role: newAdminRole });
      await fetchAdmins();
      setShowCreateModal(false);
      setNewAdminEmail("");
      setNewAdminRole("admin");
    } catch (e: any) {
      console.error("Failed to create admin:", e);
      setError(e?.message || "Yönetici oluşturulamadı");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateRole = async (adminId: number) => {
    if (!editingRole) return;

    try {
      setUpdating(true);
      setError(null);
      await updateSuperAdminRole(adminId, editingRole);
      await fetchAdmins();
      setEditingId(null);
      setEditingRole(null);
    } catch (e: any) {
      console.error("Failed to update admin role:", e);
      setError(e?.message || "Rol güncellenemedi");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (adminId: number) => {
    try {
      setDeleting(true);
      setError(null);
      await deleteSuperAdmin(adminId);
      await fetchAdmins();
      setDeletingId(null);
    } catch (e: any) {
      console.error("Failed to delete admin:", e);
      setError(e?.message || "Yönetici silinemedi");
    } finally {
      setDeleting(false);
    }
  };

  const filteredAdmins = admins.filter((admin) =>
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader
        title="Yönetici Yönetimi"
        subtitle="Sistem yöneticilerini yönetin ve rolleri ayarlayın"
        icon={<Shield className="h-5 w-5" />}
        actions={
          <button onClick={() => setShowCreateModal(true)} className="btn-primary gap-2 text-xs">
            <Plus className="h-4 w-4" /> Yönetici Ekle
          </button>
        }
      />

      {error && (
        <div className="error-banner flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
        <input
          type="text"
          placeholder="Email ile ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Admins Table */}
      <div className="card overflow-hidden">
        {filteredAdmins.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="h-10 w-10 text-surface-200 mx-auto mb-3" />
            <p className="text-surface-400 text-sm font-medium">Yönetici bulunamadı</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-surface-200 bg-surface-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Oluşturma</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filteredAdmins.map((admin) => (
                <tr key={admin.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-surface-800">{admin.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    {editingId === admin.id ? (
                      <select
                        value={editingRole || admin.role}
                        onChange={(e) => setEditingRole(e.target.value as "superadmin" | "admin")}
                        className="input-field text-xs py-1.5"
                      >
                        <option value="admin">Yönetici</option>
                        <option value="superadmin">Süper Yönetici</option>
                      </select>
                    ) : (
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                        admin.role === "superadmin" ? "bg-violet-100 text-violet-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {admin.role === "superadmin" ? "Süper Yönetici" : "Yönetici"}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-500">
                    {new Date(admin.created_at).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === admin.id ? (
                        <>
                          <button onClick={() => handleUpdateRole(admin.id)} disabled={updating} className="btn-primary text-xs px-3 py-1.5">
                            {updating ? "Kaydediyor..." : "Kaydet"}
                          </button>
                          <button onClick={() => { setEditingId(null); setEditingRole(null); }} className="btn-secondary text-xs px-3 py-1.5">
                            İptal
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(admin.id); setEditingRole(admin.role as "admin" | "superadmin"); }} className="p-2 rounded-lg hover:bg-surface-100 transition-colors">
                            <Edit2 className="h-4 w-4 text-surface-500" />
                          </button>
                          <button onClick={() => setDeletingId(admin.id)} className="p-2 rounded-lg hover:bg-rose-50 transition-colors">
                            <Trash2 className="h-4 w-4 text-rose-500" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full p-6 shadow-xl">
            <h2 className="text-lg font-bold text-surface-900 mb-4">Yeni Yönetici Ekle</h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="label">Email Adresi</label>
                <input type="email" placeholder="admin@example.com" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="label">Rol</label>
                <select value={newAdminRole} onChange={(e) => setNewAdminRole(e.target.value as "superadmin" | "admin")} className="input-field appearance-none">
                  <option value="admin">Yönetici</option>
                  <option value="superadmin">Süper Yönetici</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowCreateModal(false); setNewAdminEmail(""); setNewAdminRole("admin"); }} className="btn-secondary flex-1">İptal</button>
              <button onClick={handleCreate} disabled={creating || !newAdminEmail} className="btn-primary flex-1">
                {creating ? "Ekleniyor..." : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deletingId !== null}
        title="Yöneticiyi sil"
        description="Bu işlem geri alınamaz. Yöneticiyi silmek istediğinizden emin misiniz?"
        danger
        loading={deleting}
        onConfirm={() => deletingId && handleDelete(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
