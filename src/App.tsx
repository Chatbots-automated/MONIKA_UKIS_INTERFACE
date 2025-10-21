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

function App() {
  const [currentView, setCurrentView] = useState('dashboard');

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
