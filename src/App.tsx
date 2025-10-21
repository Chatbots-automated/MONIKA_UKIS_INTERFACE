import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { AuthForm } from './components/AuthForm';
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

function App() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentView} />;
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
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      {renderView()}
    </Layout>
  );
}

export default App;
