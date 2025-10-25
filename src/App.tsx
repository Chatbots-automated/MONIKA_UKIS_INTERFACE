import { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { ReceiveStock } from './components/ReceiveStock';
import { Treatment } from './components/Treatment';
import { Products } from './components/Products';
import { Animals } from './components/Animals';
import { Suppliers } from './components/Suppliers';
import { Biocides } from './components/Biocides';
import { OwnerMeds } from './components/OwnerMeds';
import { MedicalWaste } from './components/MedicalWaste';
import { Reports } from './components/Reports';
import { UserManagement } from './components/UserManagement';
import { AuthForm } from './components/AuthForm';
import { ModuleSelector } from './components/ModuleSelector';
import { useAuth } from './contexts/AuthContext';

type Module = 'veterinarija' | 'islaidos' | null;

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedModule, setSelectedModule] = useState<Module>(null);
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Kraunama...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  if (!selectedModule) {
    return <ModuleSelector onSelectModule={setSelectedModule} />;
  }

  if (selectedModule === 'islaidos') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 flex items-center justify-center p-8">
        <div className="text-center max-w-2xl">
          <div className="bg-white rounded-2xl shadow-xl p-12 border-2 border-amber-200">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Išlaidų Modulis
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Šis modulis yra kuriamas ir netrukus bus prieinamas
            </p>
            <p className="text-gray-500 mb-8">
              Finansų valdymo sistema leis registruoti išlaidas, kategorijas ir generuoti finansines ataskaitas.
            </p>
            <button
              onClick={() => setSelectedModule(null)}
              className="px-8 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg font-semibold hover:from-amber-700 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl"
            >
              Grįžti į pradžią
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'inventory':
        return <Inventory />;
      case 'receive':
        return <ReceiveStock />;
      case 'treatment':
        return <Treatment />;
      case 'products':
        return <Products />;
      case 'animals':
        return <Animals />;
      case 'suppliers':
        return <Suppliers />;
      case 'biocides':
        return <Biocides />;
      case 'owner-meds':
        return <OwnerMeds />;
      case 'waste':
        return <MedicalWaste />;
      case 'reports':
        return <Reports />;
      case 'users':
        return <UserManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout
      currentView={currentView}
      onNavigate={setCurrentView}
      onBackToModules={() => setSelectedModule(null)}
    >
      {renderView()}
    </Layout>
  );
}

export default App;
