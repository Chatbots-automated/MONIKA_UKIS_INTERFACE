import { Stethoscope, ArrowRight, Shield, Users, Package, Activity, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ModuleSelectorProps {
  onSelectModule: (module: 'veterinarija' | 'admin') => void;
}

export function ModuleSelector({ onSelectModule }: ModuleSelectorProps) {
  const { isAdmin, signOut, user, hasModulePermission } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Check if user can access veterinary module
  const canAccessVeterinary = hasModulePermission('veterinarija', 'view');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzMuMzEgMCA2LTIuNjkgNi02cy0yLjY5LTYtNi02LTYgMi42OS02IDYgMi42OSA2IDYgNnptMCAzMGMzLjMxIDAgNi0yLjY5IDYtNnMtMi42OS02LTYtNi02IDIuNjktNiA2IDIuNjkgNiA2IDZ6TTE2IDE0YzMuMzEgMCA2LTIuNjkgNi02cy0yLjY5LTYtNi02LTYgMi42OS02IDYgMi42OSA2IDYgNnptMCAzMGMzLjMxIDAgNi0yLjY5IDYtNnMtMi42OS02LTYtNi02IDIuNjktNiA2IDIuNjkgNiA2IDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>

      <div className="w-full max-w-4xl relative">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <img
              src="/gvet-logo.png"
              alt="Živatkauskų ūkis"
              className="w-24 h-24 rounded-2xl bg-white p-2 shadow-2xl object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Živatkauskų ūkis
          </h1>
          <p className="text-xl text-cyan-100">
            GVET PRO
          </p>
          <p className="text-cyan-200 mt-2">
            Veterinarijos valdymo sistema
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 mx-auto max-w-3xl">
          {/* Veterinarija Module - only show if user has access */}
          {canAccessVeterinary && (
            <button
              onClick={() => onSelectModule('veterinarija')}
              className="group bg-white rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2"
            >
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 lg:p-10 text-center">
              <div className="w-28 h-28 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300">
                <Stethoscope className="w-16 h-16 text-blue-600" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                Veterinarija
              </h2>
              <p className="text-base lg:text-lg text-blue-100">
                GVET PRO
              </p>
            </div>

            <div className="p-6 lg:p-8">
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                    <Package className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">Atsargų valdymas</p>
                    <p className="text-sm text-gray-600">Vaistų ir medžiagų apskaita</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">Gydymo įrašai</p>
                    <p className="text-sm text-gray-600">Gyvūnų gydymo dokumentavimas</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                    <Activity className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">Nagų sveikata</p>
                    <p className="text-sm text-gray-600">Nagų priežiūra ir analizė</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">Ataskaitos</p>
                    <p className="text-sm text-gray-600">Teisės aktų reikalavimai</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold group-hover:gap-4 transition-all">
                <span>Atidaryti sistemą</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
          )}

          {/* Admin Module (only visible to admins) */}
          {isAdmin && (
            <button
              onClick={() => onSelectModule('admin')}
              className="group bg-white rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2"
            >
              <div className="bg-gradient-to-br from-red-600 to-pink-700 p-8 lg:p-10 text-center">
                <div className="w-28 h-28 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-16 h-16 text-red-600" />
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                  Admin
                </h2>
                <p className="text-base lg:text-lg text-red-100">
                  Vartotojų Valdymas
                </p>
              </div>

              <div className="p-6 lg:p-8">
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                      <Users className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Vartotojų sąrašas</p>
                      <p className="text-sm text-gray-600">Visų sistemos vartotojų peržiūra</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                      <Shield className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Rolių valdymas</p>
                      <p className="text-sm text-gray-600">Keisti vartotojų teises</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Pridėti vartotojus</p>
                      <p className="text-sm text-gray-600">Sukurti naujas paskyras</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Veiklos stebėjimas</p>
                      <p className="text-sm text-gray-600">Vartotojų aktyvumo auditas</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-red-600 font-semibold group-hover:gap-4 transition-all">
                  <span>Atidaryti sistemą</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Show message if no modules available */}
        {!canAccessVeterinary && !isAdmin && (
          <div className="text-center mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
            <p className="text-white text-lg mb-2">Neturite prieigos prie jokių modulių</p>
            <p className="text-white/70 text-sm">Susisiekite su administratoriumi dėl prieigos teisių</p>
          </div>
        )}

        <div className="mt-12 space-y-4">
          {/* Logout Button */}
          <div className="flex justify-center">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors backdrop-blur-sm border border-white/20"
            >
              <LogOut className="w-5 h-5" />
              <span>Atsijungti</span>
              {user && <span className="text-white/70">({user.email})</span>}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-white/60">
              © 2026 Živatkauskų ūkis · GVET PRO v1.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
