import { ReactNode, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  FileText,
  Pill,
  Syringe,
  AlertTriangle,
  Droplet,
  Trash2,
  Menu,
  X,
  Building2,
  Stethoscope,
  LogOut,
  User,
  Grid3x3,
  Users
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
  onBackToModules: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Pagrindinis', icon: LayoutDashboard, permission: 'view' },
  { id: 'inventory', label: 'Atsargos', icon: Package, permission: 'view' },
  { id: 'receive', label: 'Priėmimas', icon: FileText, permission: 'receive_stock' },
  { id: 'animals', label: 'Gyvūnai', icon: Stethoscope, permission: 'animals' },
  { id: 'treatment', label: 'Gydymas / Nurašymas', icon: Syringe, permission: 'treatment' },
  { id: 'vaccinations', label: 'Vakcinacijos', icon: Syringe, permission: 'treatment' },
  { id: 'biocides', label: 'Biocidai', icon: Droplet, permission: 'biocides' },
  { id: 'owner-meds', label: 'Savininko Vaistai', icon: AlertTriangle, permission: 'products' },
  { id: 'waste', label: 'Medicininės Atliekos', icon: Trash2, permission: 'waste' },
  { id: 'products', label: 'Produktai', icon: Pill, permission: 'products' },
  { id: 'suppliers', label: 'Tiekėjai', icon: Building2, permission: 'suppliers' },
  { id: 'reports', label: 'Ataskaitos', icon: FileText, permission: 'view' },
  { id: 'users', label: 'Vartotojai', icon: Users, permission: 'manage_users' },
];

export function Layout({ children, currentView, onNavigate, onBackToModules }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, hasPermission, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`fixed left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-emerald-900 via-emerald-800 to-teal-900 shadow-2xl z-30 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-emerald-700/50">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
                <X className="w-5 h-5 text-emerald-200" />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <img
                  src="https://rekvizitai.vz.lt/logos/berciunai-16440-447.jpg"
                  alt="ZUB Berčiūnai"
                  className="w-16 h-16 rounded-lg bg-white p-1 shadow-lg object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h1 className="font-bold text-xl text-white leading-tight">ZUB Berčiūnai</h1>
                <p className="text-xs text-emerald-200 mt-1">VetStock Sistema</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-1">
              {menuItems.filter(item => hasPermission(item.permission)).map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-emerald-900 shadow-lg font-semibold'
                        : 'text-emerald-50 hover:bg-emerald-700/50 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-700' : ''}`} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="p-4 border-t border-emerald-700/50 space-y-3">
            <button
              onClick={onBackToModules}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-emerald-50 hover:bg-emerald-700/50 hover:text-white rounded-lg transition-all text-sm"
            >
              <Grid3x3 className="w-4 h-4" />
              <span>Modulių pasirinkimas</span>
            </button>
            <div className="text-xs text-emerald-300 text-center pt-2">
              <p>Veterinarijos apskaita</p>
              <p className="mt-1 text-emerald-400">v1.0.0</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Menu className="w-6 h-6 text-slate-700" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {menuItems.find(item => item.id === currentView)?.label || 'Dashboard'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">Valdymo sistema · Real-time apskaita</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onBackToModules}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200 hover:border-emerald-300"
                  title="Modulių pasirinkimas"
                >
                  <Grid3x3 className="w-4 h-4" />
                  <span>Moduliai</span>
                </button>
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                  <User className="w-4 h-4 text-emerald-700" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-emerald-900">{user?.email}</span>
                    {user && (
                      <span className="text-xs text-emerald-600">
                        {user.role === 'admin' ? 'Admin' : user.role === 'vet' ? 'Vet' : user.role === 'tech' ? 'Tech' : 'Viewer'}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                  title="Atsijungti"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Atsijungti</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 min-h-screen">
          {children}
        </main>

        <footer className="border-t border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <img
                  src="https://rekvizitai.vz.lt/logos/berciunai-16440-447.jpg"
                  alt="ZUB"
                  className="w-6 h-6 rounded object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span>© 2025 ZUB Berčiūnai. Visos teisės saugomos.</span>
              </div>
              <div className="text-xs text-gray-500">
                VetStock Sistema · Versija 1.0.0
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
