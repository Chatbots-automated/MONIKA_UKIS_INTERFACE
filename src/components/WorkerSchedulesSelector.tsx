import { useState } from 'react';
import { ArrowLeft, Users, Tractor, Warehouse } from 'lucide-react';
import { WorkerSchedulesModule } from './WorkerSchedulesModule';

interface WorkerSchedulesSelectorProps {
  onBack: () => void;
}

export function WorkerSchedulesSelector({ onBack }: WorkerSchedulesSelectorProps) {
  const [selectedLocation, setSelectedLocation] = useState<'farm' | 'warehouse' | null>(null);

  if (selectedLocation) {
    return (
      <WorkerSchedulesModule
        location={selectedLocation}
        onBack={() => setSelectedLocation(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Grįžti
        </button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Darbuotojų grafikai</h1>
          <p className="text-gray-600">Pasirinkite darbo vietą</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedLocation('farm')}
            className="group bg-white rounded-xl shadow-sm border-2 border-gray-200 hover:border-green-500 hover:shadow-md transition-all p-8 text-left"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-500 transition-colors">
                <Tractor className="w-7 h-7 text-green-600 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                  Ferma
                </h3>
                <p className="text-gray-600 text-sm">
                  Fermos darbuotojų darbo grafikai ir laikai
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedLocation('warehouse')}
            className="group bg-white rounded-xl shadow-sm border-2 border-gray-200 hover:border-slate-500 hover:shadow-md transition-all p-8 text-left"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-slate-500 transition-colors">
                <Warehouse className="w-7 h-7 text-slate-600 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-slate-600 transition-colors">
                  Technikos kiemas
                </h3>
                <p className="text-gray-600 text-sm">
                  Technikos kiemo darbuotojų darbo grafikai ir laikai
                </p>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-12 max-w-2xl mx-auto bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Būsimos funkcijos</h4>
              <p className="text-sm text-blue-800">
                Darbuotojai galės prisijungti prie savo paskyrų, peržiūrėti savo grafikus ir pateikti
                ataskaitą apie atliktus darbus. Administratoriai galės patvirtinti pateiktas ataskaitas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
