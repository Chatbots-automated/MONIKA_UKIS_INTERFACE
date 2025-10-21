import { ReactNode, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  FileText,
  Users,
  Pill,
  Syringe,
  AlertTriangle,
  Droplet,
  Trash2,
  Menu,
  X,
  Building2,
  Stethoscope
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'receive', label: 'Receive Stock', icon: FileText },
  { id: 'treatment', label: 'Treatment / Write-off', icon: Syringe },
  { id: 'products', label: 'Products', icon: Pill },
  { id: 'animals', label: 'Animals', icon: Stethoscope },
  { id: 'suppliers', label: 'Suppliers', icon: Building2 },
  { id: 'biocides', label: 'Biocides', icon: Droplet },
  { id: 'owner-meds', label: 'Owner Meds', icon: AlertTriangle },
  { id: 'waste', label: 'Medical Waste', icon: Trash2 },
  { id: 'reports', label: 'Reports', icon: FileText },
];

export function Layout({ children, currentView, onNavigate }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`fixed left-0 top-0 bottom-0 w-64 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 z-30 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-bold text-xl text-white">ZUB Berčiūnai</h1>
                <p className="text-xs text-slate-400 mt-1">Veterinary Management</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="p-4 border-t border-slate-700">
            <div className="text-sm text-center">
              <p className="font-semibold text-white">ZUB Berčiūnai</p>
              <p className="text-xs text-slate-400 mt-1">Veterinary Clinic</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6 text-slate-700" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {menuItems.find(item => item.id === currentView)?.label || 'Dashboard'}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">ZUB Berčiūnai Management System</p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-gray-100 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
