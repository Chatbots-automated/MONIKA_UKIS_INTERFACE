import { useEffect, useState } from 'react';
import { Users, UserPlus, Trash2, Edit2, Shield, Eye, Stethoscope, Wrench, Mail, Calendar, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth, UserRole, UserProfile } from '../contexts/AuthContext';
import { formatDateLT } from '../lib/formatters';

interface UserWithEmail extends UserProfile {
  email: string;
}

export function UserManagement() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('viewer');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('viewer');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const usersWithEmails: UserWithEmail[] = [];

      for (const profile of profiles || []) {
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(profile.user_id);

        if (!userError && user) {
          usersWithEmails.push({
            ...profile,
            email: user.email || 'No email'
          });
        }
      }

      setUsers(usersWithEmails);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: editRole })
        .eq('user_id', userId);

      if (error) throw error;

      setSuccess('Role updated successfully');
      setEditingUser(null);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
      });

      if (error) throw error;

      if (data.user) {
        await supabase
          .from('user_profiles')
          .update({ role: newUserRole })
          .eq('user_id', data.user.id);
      }

      setSuccess('User added successfully');
      setShowAddUser(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('viewer');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add user');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      setSuccess('User deleted successfully');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'vet':
        return <Stethoscope className="w-4 h-4" />;
      case 'tech':
        return <Wrench className="w-4 h-4" />;
      case 'viewer':
        return <Eye className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'vet':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'tech':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Administratorius';
      case 'vet':
        return 'Veterinaras';
      case 'tech':
        return 'Technikas';
      case 'viewer':
        return 'Stebėtojas';
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need admin permissions to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl shadow-lg">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vartotojų Valdymas</h1>
            <p className="text-gray-600 mt-1">Valdyti sistemos vartotojus ir jų roles</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddUser(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg"
        >
          <UserPlus className="w-5 h-5" />
          <span>Pridėti Vartotoją</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <X className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}

      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Pridėti Naują Vartotoją</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  El. paštas
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slaptažodis
                </label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rolė
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="viewer">Stebėtojas (View Only)</option>
                  <option value="tech">Technikas (Limited Access)</option>
                  <option value="vet">Veterinaras (Full Access)</option>
                  <option value="admin">Administratorius (All Access)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all"
                >
                  Pridėti
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUser(false);
                    setNewUserEmail('');
                    setNewUserPassword('');
                    setNewUserRole('viewer');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Atšaukti
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Vartotojas
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Rolė
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Sukurta
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Veiksmai
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                          <Mail className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.email}</p>
                          <p className="text-sm text-gray-500">ID: {user.user_id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingUser === user.user_id ? (
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as UserRole)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                          <option value="viewer">Stebėtojas</option>
                          <option value="tech">Technikas</option>
                          <option value="vet">Veterinaras</option>
                          <option value="admin">Administratorius</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${getRoleColor(user.role)}`}>
                          {getRoleIcon(user.role)}
                          {getRoleLabel(user.role)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {formatDateLT(user.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingUser === user.user_id ? (
                          <>
                            <button
                              onClick={() => handleUpdateRole(user.user_id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Save"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Cancel"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingUser(user.user_id);
                                setEditRole(user.role);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Role"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.user_id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl p-6 border border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Rolių Aprašymas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-red-600" />
              <h4 className="font-semibold text-gray-900">Administratorius</h4>
            </div>
            <p className="text-sm text-gray-600">Pilna prieiga prie visų funkcijų ir vartotojų valdymo</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-gray-900">Veterinaras</h4>
            </div>
            <p className="text-sm text-gray-600">Pilna prieiga prie veterinarijos sistemų ir gydymo įrašų</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-amber-600" />
              <h4 className="font-semibold text-gray-900">Technikas</h4>
            </div>
            <p className="text-sm text-gray-600">Atsargų priėmimas, biocidai, atliekos; negali trinti įrašų</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-gray-600" />
              <h4 className="font-semibold text-gray-900">Stebėtojas</h4>
            </div>
            <p className="text-sm text-gray-600">Tik peržiūros prieiga, negali keisti duomenų</p>
          </div>
        </div>
      </div>
    </div>
  );
}
