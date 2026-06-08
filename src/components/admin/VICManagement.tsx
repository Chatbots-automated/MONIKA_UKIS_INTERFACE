import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Save, Eye, EyeOff, Key, Users } from 'lucide-react';

export function VICManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  
  // VIC Login - single credential
  const [vicUsername, setVicUsername] = useState('');
  const [vicPassword, setVicPassword] = useState('');
  const [vicCredentialId, setVicCredentialId] = useState<string | null>(null);
  
  // Savininkai - 3 owners
  const [owner1Name, setOwner1Name] = useState('');
  const [owner1Code, setOwner1Code] = useState('');
  const [owner1Id, setOwner1Id] = useState<string | null>(null);
  
  const [owner2Name, setOwner2Name] = useState('');
  const [owner2Code, setOwner2Code] = useState('');
  const [owner2Id, setOwner2Id] = useState<string | null>(null);
  
  const [owner3Name, setOwner3Name] = useState('');
  const [owner3Code, setOwner3Code] = useState('');
  const [owner3Id, setOwner3Id] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [credentialsRes, clientsRes] = await Promise.all([
        supabase.from('vic_credentials').select('*').limit(1).single(),
        supabase.from('vic_clients').select('*').order('created_at', { ascending: true }).limit(3)
      ]);

      // Load VIC credential
      if (credentialsRes.data) {
        setVicUsername(credentialsRes.data.username || '');
        setVicPassword(credentialsRes.data.password_encrypted || '');
        setVicCredentialId(credentialsRes.data.id);
      }

      // Load owners (up to 3)
      const owners = clientsRes.data || [];
      if (owners[0]) {
        setOwner1Name(owners[0].client_name);
        setOwner1Code(owners[0].personal_code);
        setOwner1Id(owners[0].id);
      }
      if (owners[1]) {
        setOwner2Name(owners[1].client_name);
        setOwner2Code(owners[1].personal_code);
        setOwner2Id(owners[1].id);
      }
      if (owners[2]) {
        setOwner3Name(owners[2].client_name);
        setOwner3Code(owners[2].personal_code);
        setOwner3Id(owners[2].id);
      }
    } catch (err: any) {
      // Ignore errors if no data exists yet
      if (err.code !== 'PGRST116') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Save VIC credential
      if (vicUsername && vicPassword) {
        if (vicCredentialId) {
          await supabase
            .from('vic_credentials')
            .update({
              username: vicUsername,
              password_encrypted: vicPassword,
              updated_by: userId
            })
            .eq('id', vicCredentialId);
        } else {
          const { data } = await supabase.from('vic_credentials').insert({
            credential_name: 'VIC Prisijungimas',
            username: vicUsername,
            password_encrypted: vicPassword,
            is_active: true,
            created_by: userId
          }).select().single();
          if (data) setVicCredentialId(data.id);
        }
      }

      // Save Owner 1
      if (owner1Name && owner1Code) {
        if (owner1Id) {
          await supabase
            .from('vic_clients')
            .update({
              client_name: owner1Name,
              personal_code: owner1Code,
              updated_by: userId
            })
            .eq('id', owner1Id);
        } else {
          const { data } = await supabase.from('vic_clients').insert({
            client_name: owner1Name,
            personal_code: owner1Code,
            is_active: true,
            created_by: userId
          }).select().single();
          if (data) setOwner1Id(data.id);
        }
      }

      // Save Owner 2
      if (owner2Name && owner2Code) {
        if (owner2Id) {
          await supabase
            .from('vic_clients')
            .update({
              client_name: owner2Name,
              personal_code: owner2Code,
              updated_by: userId
            })
            .eq('id', owner2Id);
        } else {
          const { data } = await supabase.from('vic_clients').insert({
            client_name: owner2Name,
            personal_code: owner2Code,
            is_active: true,
            created_by: userId
          }).select().single();
          if (data) setOwner2Id(data.id);
        }
      }

      // Save Owner 3
      if (owner3Name && owner3Code) {
        if (owner3Id) {
          await supabase
            .from('vic_clients')
            .update({
              client_name: owner3Name,
              personal_code: owner3Code,
              updated_by: userId
            })
            .eq('id', owner3Id);
        } else {
          const { data } = await supabase.from('vic_clients').insert({
            client_name: owner3Name,
            personal_code: owner3Code,
            is_active: true,
            created_by: userId
          }).select().single();
          if (data) setOwner3Id(data.id);
        }
      }

      setSuccess('Visi duomenys sėkmingai išsaugoti!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-cyan-700" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">VIC Duomenys ir Kodai</h1>
          <p className="text-gray-600 mt-1">Veterinary Information Center prisijungimo duomenys ir savininkai</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* VIC Credentials Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <Key className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">VIC Prisijungimo Duomenys</h2>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vartotojo Vardas *
              </label>
              <input
                type="text"
                value={vicUsername}
                onChange={(e) => setVicUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                placeholder="VIC vartotojo vardas"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slaptažodis *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={vicPassword}
                  onChange={(e) => setVicPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 pr-10"
                  placeholder="Slaptažodis"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Savininkai Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Savininkai</h2>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Owner 1 */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Savininkas 1</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Savininko Vardas *
                </label>
                <input
                  type="text"
                  value={owner1Name}
                  onChange={(e) => setOwner1Name(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Vardas Pavardė"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asmens Kodas *
                </label>
                <input
                  type="text"
                  value={owner1Code}
                  onChange={(e) => setOwner1Code(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="12345678901"
                />
              </div>
            </div>
          </div>

          {/* Owner 2 */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Savininkas 2</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Savininko Vardas *
                </label>
                <input
                  type="text"
                  value={owner2Name}
                  onChange={(e) => setOwner2Name(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Vardas Pavardė"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asmens Kodas *
                </label>
                <input
                  type="text"
                  value={owner2Code}
                  onChange={(e) => setOwner2Code(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="12345678901"
                />
              </div>
            </div>
          </div>

          {/* Owner 3 */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Savininkas 3</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Savininko Vardas *
                </label>
                <input
                  type="text"
                  value={owner3Name}
                  onChange={(e) => setOwner3Name(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Vardas Pavardė"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asmens Kodas *
                </label>
                <input
                  type="text"
                  value={owner3Code}
                  onChange={(e) => setOwner3Code(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="12345678901"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-colors disabled:opacity-50 font-medium shadow-lg"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saugoma...' : 'Išsaugoti Visus Duomenis'}
        </button>
      </div>
    </div>
  );
}
