import { useState } from 'react';
import {
  Wrench,
  Package,
  FileText,
  Truck,
  ClipboardList,
  Calendar,
  BarChart3,
  HardHat,
  Menu,
  X,
  ArrowLeft,
  Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface TechnikaProps {
  onBackToModules: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Pagrindinis', icon: BarChart3 },
  { id: 'invoices', label: 'Sąskaitos', icon: FileText },
  { id: 'tools', label: 'Įrankiai', icon: Wrench },
  { id: 'ppe', label: 'Drabužiai/PPE', icon: HardHat },
  { id: 'vehicles', label: 'Transportas', icon: Truck },
  { id: 'work-orders', label: 'Aptarnavimai', icon: ClipboardList },
  { id: 'schedules', label: 'Grafikai', icon: Calendar },
  { id: 'inventory', label: 'Sandėlis', icon: Package },
  { id: 'reports', label: 'Ataskaitos', icon: BarChart3 },
];

export function Technika({ onBackToModules }: TechnikaProps) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();

  const currentMenuItem = menuItems.find(item => item.id === currentView);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <TechnikaDashboard />;
      case 'invoices':
        return <EquipmentInvoices />;
      case 'tools':
        return <ToolsManagement />;
      case 'ppe':
        return <PPEManagement />;
      case 'vehicles':
        return <VehiclesManagement />;
      case 'work-orders':
        return <WorkOrders />;
      case 'schedules':
        return <MaintenanceSchedules />;
      case 'inventory':
        return <EquipmentInventory />;
      case 'reports':
        return <TechnikaReports />;
      default:
        return <TechnikaDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden transition-opacity ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 bg-gradient-to-b from-slate-800 via-slate-700 to-gray-800 shadow-2xl z-30 transition-all duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-600/50">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 hover:bg-slate-600/50 rounded"
              >
                <X className="w-5 h-5 text-slate-200" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center shadow-lg">
                <Settings className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-white leading-tight">Technika</h1>
                <p className="text-xs text-slate-300">Įranga ir transportas</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-slate-600 text-white shadow-lg'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-600/50">
            <button
              onClick={onBackToModules}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium text-sm">Grįžti į modulius</span>
            </button>
            {user && (
              <div className="mt-2 px-4 py-2 bg-slate-700/30 rounded-lg">
                <p className="text-xs text-slate-400">Prisijungęs:</p>
                <p className="text-sm text-white font-medium truncate">{user.email}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                {currentMenuItem && (
                  <>
                    <currentMenuItem.icon className="w-6 h-6 text-slate-600" />
                    <h2 className="text-xl font-bold text-gray-800">{currentMenuItem.label}</h2>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="p-6">{renderContent()}</div>
      </div>
    </div>
  );
}

// Dashboard Component
function TechnikaDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Įrankiai"
          value="42"
          subtitle="Aktyvūs įrankiai"
          icon={Wrench}
          color="blue"
        />
        <StatCard
          title="Transportas"
          value="8"
          subtitle="Aktyvios transporto priemonės"
          icon={Truck}
          color="green"
        />
        <StatCard
          title="Aptarnavimai"
          value="3"
          subtitle="Laukiantys aptarnavimai"
          icon={ClipboardList}
          color="amber"
        />
        <StatCard
          title="PPE"
          value="156"
          subtitle="Vienetai sandėlyje"
          icon={HardHat}
          color="purple"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Sveiki atvykę į Technikos modulį</h3>
        <p className="text-gray-600 mb-4">
          Šis modulis skirtas valdyti įrankius, asmeninės apsaugos priemones, transporto priemones ir jų aptarnavimą.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Įrankių valdymas</h4>
            <p className="text-sm text-gray-600">
              Registruokite įrankius, sekite jų išdavimą darbuotojams ir stebėkite būklę.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Transporto apskaita</h4>
            <p className="text-sm text-gray-600">
              Valdykite transporto priemonių parką, draudimus, TA ir planinį aptarnavimą.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">PPE išdavimas</h4>
            <p className="text-sm text-gray-600">
              Sekite darbuotojams išduotų apsauginių priemonių ir drabužių apskaitą.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Aptarnavimų valdymas</h4>
            <p className="text-sm text-gray-600">
              Planuokite ir vykdykite transporto bei įrangos aptarnavimus ir remontus.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Placeholder components
function EquipmentInvoices() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Sąskaitos ir pajamavimas</h3>
      <p className="text-gray-600">Įrangos pirkimo sąskaitų valdymas ir pajamavimas į sandėlį.</p>
    </div>
  );
}

function ToolsManagement() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Įrankių valdymas</h3>
      <p className="text-gray-600">Įrankių registravimas, išdavimas ir grąžinimas.</p>
    </div>
  );
}

function PPEManagement() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">PPE ir drabužių valdymas</h3>
      <p className="text-gray-600">Apsauginių priemonių ir drabužių išdavimo registracija.</p>
    </div>
  );
}

function VehiclesManagement() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Transporto priemonių valdymas</h3>
      <p className="text-gray-600">Transporto priemonių parkas, draudimai ir techninė apžiūra.</p>
    </div>
  );
}

function WorkOrders() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Aptarnavimų užsakymai</h3>
      <p className="text-gray-600">Planinių ir neplaninių aptarnavimų valdymas.</p>
    </div>
  );
}

function MaintenanceSchedules() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Aptarnavimų grafikai</h3>
      <p className="text-gray-600">Planinių aptarnavimų grafikų nustatymas pagal laiką, ridą ar motovalandas.</p>
    </div>
  );
}

function EquipmentInventory() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Sandėlio atsargos</h3>
      <p className="text-gray-600">Tepalų, filtrų ir kitų eksploatacinių medžiagų atsargos.</p>
    </div>
  );
}

function TechnikaReports() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Ataskaitos</h3>
      <p className="text-gray-600">Išlaidų, judėjimo ir terminų ataskaitos.</p>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'amber' | 'purple';
}

function StatCard({ title, value, subtitle, icon: Icon, color }: StatCardProps) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    amber: 'from-amber-500 to-amber-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 bg-gradient-to-br ${colors[color]} rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}
