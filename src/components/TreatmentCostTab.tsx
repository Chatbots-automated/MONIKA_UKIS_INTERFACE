import { useState } from 'react';
import { MastitisMilk } from './MastitisMilk';
import { TreatmentCostAnalysis } from './TreatmentCostAnalysis';
import { Droplet, Euro } from 'lucide-react';

export function TreatmentCostTab() {
  const [activeTab, setActiveTab] = useState<'mastitis' | 'costs'>('costs');

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('costs')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'costs'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Euro className="w-5 h-5" />
            <span>Gydymų Savikainos</span>
          </button>
          <button
            onClick={() => setActiveTab('mastitis')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'mastitis'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Droplet className="w-5 h-5" />
            <span>Mastitinis Pienas</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'costs' && <TreatmentCostAnalysis />}
        {activeTab === 'mastitis' && <MastitisMilk />}
      </div>
    </div>
  );
}
