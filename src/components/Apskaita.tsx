import { useState } from 'react';
import { ReceiveStock } from './ReceiveStock';
import { Reports } from './Reports';
import { Analytics } from './apskaita/Analytics';
import { Products } from './Products';
import { 
  FileText, 
  BarChart3, 
  Menu, 
  X, 
  Grid3x3, 
  LogOut, 
  User,
  StickyNote,
  Calculator,
  TrendingUp,
  Pill
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Notepad from './Notepad';

interface ApskaitaProps {
  onBackToModules: () => void;
}

const menuItems = [
  { id: 'pajamavimas', label: 'Pajamavimas', icon: FileText },
  { id: 'produktai', label: 'Produktai', icon: Pill },
  { id: 'ataskaitos', label: 'Ataskaitos', icon: BarChart3 },
  { id: 'analitika', label: 'Analitika', icon: TrendingUp },
];

export function Apskaita({ onBackToModules }: ApskaitaProps) {
  const [currentView, setCurrentView] = useState('pajamavimas');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notepadOpen, setNotepadOpen] = useState(false);
  const { user, signOut, logAction } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'pajamavimas':
        return <ReceiveStock />;
      case 'produktai':
        return <Products />;
      case 'ataskaitos':
        return <Reports />;
      case 'analitika':
        return <Analytics />;
      default:
        return <ReceiveStock />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100">
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`fixed left-0 top-0 bottom-0 w-56 xl:w-72 bg-gradient-to-b from-emerald-900 via-green-900 to-emerald-900 shadow-2xl z-30 transition-all duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-3 xl:p-6 border-b border-green-700/50">
            <div className="flex items-center justify-between mb-2 xl:mb-4">
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 xl:p-2 hover:bg-green-700/50 rounded">
                <X className="w-4 xl:w-5 h-4 xl:h-5 text-green-200" />
              </button>
            </div>
            <div className="flex items-center gap-2 xl:gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 xl:w-16 h-10 xl:h-16 bg-white rounded-lg flex items-center justify-center shadow-lg">
                  <Calculator className="w-6 xl:w-10 h-6 xl:h-10 text-emerald-600" />
                </div>
              </div>
              <div>
                <h1 className="font-bold text-sm xl:text-xl text-white leading-tight">Apskaita</h1>
                <p className="text-xs text-green-200 xl:mt-1">Pajamavimas & Ataskaitos</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-2 xl:p-4 overflow-y-auto overflow-x-hidden">
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
                      logAction('navigate_to_page', null, null, null, { page: item.id, label: item.label });
                    }}
                    className={`w-full flex items-center gap-2 xl:gap-3 px-2 xl:px-4 py-2 xl:py-3 rounded-lg transition-all duration-200 min-h-[40px] xl:min-h-[44px] touch-manipulation ${
                      isActive
                        ? 'bg-white text-emerald-900 shadow-lg font-semibold'
                        : 'text-green-50 hover:bg-green-700/50 hover:text-white active:bg-green-600/50'
                    }`}
                  >
                    <Icon className={`w-4 xl:w-5 h-4 xl:h-5 flex-shrink-0 ${isActive ? 'text-emerald-700' : ''}`} />
                    <span className="text-xs xl:text-sm truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="p-2 xl:p-4 border-t border-green-700/50 xl:space-y-3">
            <button
              onClick={onBackToModules}
              className="w-full flex items-center gap-2 xl:gap-3 px-2 xl:px-4 py-2 xl:py-2.5 text-green-50 hover:bg-green-700/50 hover:text-white rounded-lg transition-all text-xs xl:text-sm min-h-[40px] xl:min-h-[44px] touch-manipulation active:bg-green-600/50"
            >
              <Grid3x3 className="w-4 h-4" />
              <span className="truncate"><span className="xl:hidden">Moduliai</span><span className="hidden xl:inline">Modulių pasirinkimas</span></span>
            </button>
            <div className="text-xs text-green-300 xl:text-green-400 text-center pt-1 xl:pt-2">
              <p className="hidden xl:block">APSKAITA</p>
              <p className="xl:mt-1">v1.0<span className="hidden xl:inline">.0</span></p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-56 xl:pl-72">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="px-2 xl:px-6 py-2 xl:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 xl:gap-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors min-w-[40px] xl:min-w-[44px] min-h-[40px] xl:min-h-[44px] touch-manipulation active:bg-slate-200"
                >
                  <Menu className="w-5 xl:w-6 h-5 xl:h-6 text-slate-700" />
                </button>
                <div>
                  <h2 className="text-base xl:text-2xl font-bold text-gray-900">
                    {menuItems.find(item => item.id === currentView)?.label || 'Pajamavimas'}
                  </h2>
                  <p className="text-xs xl:text-sm text-gray-500 mt-0.5 hidden xl:block">Apskaitos valdymas · Real-time sistema</p>
                </div>
              </div>

              <div className="flex items-center gap-1 xl:gap-3">
                <button
                  onClick={onBackToModules}
                  className="hidden xl:flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200 hover:border-emerald-300"
                  title="Modulių pasirinkimas"
                >
                  <Grid3x3 className="w-4 h-4" />
                  <span>Moduliai</span>
                </button>
                <button
                  onClick={() => setNotepadOpen(true)}
                  className="flex items-center gap-2 px-2 xl:px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 rounded-lg transition-colors border border-amber-200 hover:border-amber-300"
                  title="Užrašinė"
                >
                  <StickyNote className="w-4 h-4" />
                  <span className="hidden xl:inline">Užrašinė</span>
                </button>
                <div className="flex items-center gap-2 px-2 xl:px-4 py-1.5 xl:py-2 bg-gradient-to-r from-emerald-50 to-green-100 rounded-lg border border-emerald-200 min-h-[36px]">
                  <User className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs xl:text-sm font-medium text-emerald-900 truncate max-w-[80px] xl:max-w-none">
                      {user?.full_name || user?.email}
                    </span>
                    {user && (
                      <span className="text-xs text-emerald-700 hidden xl:block">
                        {user.role === 'admin' ? 'Admin' : user.role === 'vet' ? 'Veterinaras' : user.role === 'tech' ? 'Technikas' : 'Žiūrėtojas'}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-2 xl:px-4 py-2 text-xs xl:text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 min-w-[36px]"
                  title="Atsijungti"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden xl:inline">Atsijungti</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="p-2 xl:p-8">
          {renderView()}
        </main>
      </div>

      <Notepad isOpen={notepadOpen} onClose={() => setNotepadOpen(false)} />
    </div>
  );
}
