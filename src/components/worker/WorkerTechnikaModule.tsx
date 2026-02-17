import { useState } from 'react';
import { Package, Truck, Shield, Wrench, ClipboardList } from 'lucide-react';
import { ProductsManagement } from '../technika/ProductsManagement';
import { VehiclesManagement } from '../technika/VehiclesManagement';
import { TechnicalInspectionInsurance } from '../technika/TechnicalInspectionInsurance';
import { MaintenanceSchedules } from '../technika/MaintenanceSchedules';
import { WorkOrders } from '../technika/WorkOrders';
import { useAuth } from '../../contexts/AuthContext';

interface WorkerTechnikaModuleProps {
  workLocation: 'farm' | 'warehouse';
  activeTimeEntry: any | null;
}

type WorkerTab = 'products' | 'vehicles' | 'technical' | 'maintenance' | 'work-orders';

const menuItems = [
  { id: 'products' as WorkerTab, label: 'Produktai', icon: Package },
  { id: 'vehicles' as WorkerTab, label: 'Transportas', icon: Truck },
  { id: 'technical' as WorkerTab, label: 'Techninės ir draudimai', icon: Shield },
  { id: 'maintenance' as WorkerTab, label: 'Planiniai aptarnavimai', icon: Wrench },
  { id: 'work-orders' as WorkerTab, label: 'Remonto darbai', icon: ClipboardList },
];

export function WorkerTechnikaModule({ workLocation, activeTimeEntry }: WorkerTechnikaModuleProps) {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<WorkerTab>('products');

  const renderContent = () => {
    switch (currentTab) {
      case 'products':
        return <ProductsManagement locationFilter={workLocation} workerMode={true} />;
      case 'vehicles':
        return <VehiclesManagement workerMode={true} />;
      case 'technical':
        return <TechnicalInspectionInsurance workerMode={true} />;
      case 'maintenance':
        return (
          <MaintenanceSchedules
            workerMode={true}
            workerId={user?.id}
            activeTimeEntry={activeTimeEntry}
          />
        );
      case 'work-orders':
        return (
          <WorkOrders
            workerMode={true}
            workerId={user?.id}
            activeTimeEntry={activeTimeEntry}
          />
        );
      default:
        return <ProductsManagement locationFilter={workLocation} workerMode={true} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Darbo vieta:</strong> Čia galite peržiūrėti produktus, transportą ir technines apžiūras. 
          Taip pat galite dirbti su planiniais aptarnavimais ir remonto darbais bei pranešti apie atliktus darbus.
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${
                    currentTab === item.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
