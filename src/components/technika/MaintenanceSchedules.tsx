import { Calendar, Plus } from 'lucide-react';

export function MaintenanceSchedules() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Aptarnavimų grafikai</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors">
            <Plus className="w-4 h-4" />
            Naujas grafikas
          </button>
        </div>
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Planinių aptarnavimų grafikai</p>
          <p className="text-sm text-gray-500">Nustatykite automatinius aptarnavimus pagal laiką, ridą ar motovalandas</p>
        </div>
      </div>
    </div>
  );
}
