import { BarChart3, FileText, Download } from 'lucide-react';

export function TechnikaReports() {
  const reports = [
    {
      title: 'Įrankių judėjimo ataskaita',
      description: 'Įrankių išdavimo ir grąžinimo istorija',
      icon: FileText,
    },
    {
      title: 'Aptarnavimų išlaidų ataskaita',
      description: 'Transporto aptarnavimo kaštų suvestinė',
      icon: BarChart3,
    },
    {
      title: 'PPE išdavimo ataskaita',
      description: 'Darbuotojams išduotų apsaugos priemonių sąrašas',
      icon: FileText,
    },
    {
      title: 'Transporto naudojimo ataskaita',
      description: 'Ridos ir motovalandų statistika',
      icon: BarChart3,
    },
    {
      title: 'Draudimų ir TA terminų ataskaita',
      description: 'Artėjantys draudimų ir techninių apžiūrų terminai',
      icon: FileText,
    },
    {
      title: 'Sandėlio atsargų ataskaita',
      description: 'Tepalų, filtrų ir kitų medžiagų likučiai',
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Ataskaitos</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report, index) => {
            const Icon = report.icon;
            return (
              <button
                key={index}
                className="border border-gray-200 rounded-lg p-6 hover:border-slate-400 hover:bg-slate-50 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                    <Icon className="w-6 h-6 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 mb-1">{report.title}</h4>
                    <p className="text-sm text-gray-600 mb-3">{report.description}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                      <Download className="w-4 h-4" />
                      <span>Generuoti</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Greitosios statistikos</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Šio mėnesio išlaidos" value="€0.00" />
          <StatCard title="Įrankių judėjimai" value="0" />
          <StatCard title="Atlikti aptarnavimai" value="0" />
          <StatCard title="Išduota PPE" value="0" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
