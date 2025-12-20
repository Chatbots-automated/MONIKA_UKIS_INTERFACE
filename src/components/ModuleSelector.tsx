import { Stethoscope, Euro, ArrowRight, Package, Shield, Users, Droplets, Beaker, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ModuleSelectorProps {
  onSelectModule: (module: 'veterinarija' | 'islaidos' | 'admin' | 'pienas') => void;
}

export function ModuleSelector({ onSelectModule }: ModuleSelectorProps) {
  const { isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-emerald-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzMuMzEgMCA2LTIuNjkgNi02cy0yLjY5LTYtNi02LTYgMi42OS02IDYgMi42OSA2IDYgNnptMCAzMGMzLjMxIDAgNi0yLjY5IDYtNnMtMi42OS02LTYtNi02IDIuNjktNiA2IDIuNjkgNiA2IDZ6TTE2IDE0YzMuMzEgMCA2LTIuNjkgNi02cy0yLjY5LTYtNi02LTYgMi42OS02IDYgMi42OSA2IDYgNnptMCAzMGMzLjMxIDAgNi0yLjY5IDYtNnMtMi42OS02LTYtNi02IDIuNjktNiA2IDIuNjkgNiA2IDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>

      <div className="w-full max-w-6xl relative">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <img
              src="https://rekvizitai.vz.lt/logos/berciunai-16440-447.jpg"
              alt="ŽŪB Berčiunai"
              className="w-24 h-24 rounded-2xl bg-white p-2 shadow-2xl object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            ŽŪB Berčiunai
          </h1>
          <p className="text-xl text-emerald-100">
            Valdymo Sistema
          </p>
          <p className="text-emerald-200 mt-2">
            Pasirinkite modulį, kurį norite naudoti
          </p>
        </div>

        <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-2 lg:grid-cols-4 max-w-7xl' : 'md:grid-cols-2 lg:grid-cols-3 max-w-6xl'} gap-8 mx-auto`}>
          <button
            onClick={() => onSelectModule('veterinarija')}
            className="group bg-white rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2"
          >
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 text-center">
              <div className="w-20 h-20 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300">
                <Stethoscope className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Veterinarija
              </h2>
              <p className="text-blue-100">
                VetStock Sistema
              </p>
            </div>

            <div className="p-8">
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                    <Package className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Atsargų valdymas</p>
                    <p className="text-sm text-gray-600">Vaistų ir medžiagų apskaita</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Gydymo įrašai</p>
                    <p className="text-sm text-gray-600">Gyvūnų gydymo dokumentavimas</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Ataskaitos</p>
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

          <button
            onClick={() => onSelectModule('islaidos')}
            className="group bg-white rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2 relative"
          >
            <div className="bg-gradient-to-br from-amber-600 to-amber-700 p-8 text-center">
              <div className="w-20 h-20 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300">
                <Euro className="w-12 h-12 text-amber-600" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Išlaidos
              </h2>
              <p className="text-amber-100">
                Finansų Valdymas
              </p>
            </div>

            <div className="p-8">
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
                    <Euro className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Išlaidų apskaita</p>
                    <p className="text-sm text-gray-600">Visų išlaidų registravimas</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Kategorijos</p>
                    <p className="text-sm text-gray-600">Išlaidų grupavimas</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Analizė</p>
                    <p className="text-sm text-gray-600">Finansinės ataskaitos</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-amber-600 font-semibold group-hover:gap-4 transition-all">
                <span>Atidaryti sistemą</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectModule('pienas')}
            className="group bg-white rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2"
          >
            <div className="bg-gradient-to-br from-cyan-600 to-blue-700 p-8 text-center">
              <div className="w-20 h-20 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300">
                <Droplets className="w-12 h-12 text-cyan-600" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Pienas
              </h2>
              <p className="text-cyan-100">
                Pieno Apskaita
              </p>
            </div>

            <div className="p-8">
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-cyan-100 rounded-full flex items-center justify-center mt-0.5">
                    <Activity className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Gamybos įrašai</p>
                    <p className="text-sm text-gray-600">Realaus laiko melžimo duomenys</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-cyan-100 rounded-full flex items-center justify-center mt-0.5">
                    <Beaker className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Pieno tyrimai</p>
                    <p className="text-sm text-gray-600">Kokybės analizė ir SCC</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-cyan-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Analitika</p>
                    <p className="text-sm text-gray-600">Gamybos ir kokybės ataskaitos</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-cyan-600 font-semibold group-hover:gap-4 transition-all">
                <span>Atidaryti sistemą</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>

          {isAdmin && (
            <button
              onClick={() => onSelectModule('admin')}
              className="group bg-white rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2"
            >
              <div className="bg-gradient-to-br from-red-600 to-pink-700 p-8 text-center">
                <div className="w-20 h-20 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-12 h-12 text-red-600" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Admin
                </h2>
                <p className="text-red-100">
                  Vartotojų Valdymas
                </p>
              </div>

              <div className="p-8">
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                      <Users className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Vartotojų sąrašas</p>
                      <p className="text-sm text-gray-600">Visų sistemos vartotojų peržiūra</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                      <Shield className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Rolių valdymas</p>
                      <p className="text-sm text-gray-600">Keisti vartotojų teises</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Pridėti vartotojus</p>
                      <p className="text-sm text-gray-600">Sukurti naujas paskyras</p>
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

        <div className="mt-12 text-center">
          <p className="text-sm text-white/60">
            © 2025 ŽŪB Berčiūnai · Versija 1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
