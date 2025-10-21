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
import { AuthForm } from './components/AuthForm';
import { useAuth } from './contexts/AuthContext';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Kraunama...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
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
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      {renderView()}
    </Layout>
  );
}

export default App;
