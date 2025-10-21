import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Animal } from '../lib/types';
import { Plus, Edit2, Save, X, Stethoscope } from 'lucide-react';

export function Animals() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const emptyAnimal = {
    tag_no: '',
    species: 'bovine',
    sex: '',
    age_months: '',
    holder_name: '',
    holder_address: '',
  };

  const [formData, setFormData] = useState(emptyAnimal);

  useEffect(() => {
    loadAnimals();
  }, []);

  const loadAnimals = async () => {
    try {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .order('tag_no');

      if (error) throw error;
      setAnimals(data || []);
    } catch (error) {
      console.error('Error loading animals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const animalData = {
        tag_no: formData.tag_no || null,
        species: formData.species,
        sex: formData.sex || null,
        age_months: formData.age_months ? parseInt(formData.age_months) : null,
        holder_name: formData.holder_name || null,
        holder_address: formData.holder_address || null,
      };

      if (editing) {
        const { error } = await supabase
          .from('animals')
          .update(animalData)
          .eq('id', editing);

        if (error) throw error;
        setEditing(null);
      } else {
        const { error } = await supabase
          .from('animals')
          .insert(animalData);

        if (error) throw error;
        setShowAdd(false);
      }

      setFormData(emptyAnimal);
      await loadAnimals();
    } catch (error: any) {
      alert('Klaida: ' + error.message);
    }
  };

  const handleEdit = (animal: Animal) => {
    setEditing(animal.id);
    setFormData({
      tag_no: animal.tag_no || '',
      species: animal.species,
      sex: animal.sex || '',
      age_months: animal.age_months?.toString() || '',
      holder_name: animal.holder_name || '',
      holder_address: animal.holder_address || '',
    });
  };

  const handleCancel = () => {
    setEditing(null);
    setShowAdd(false);
    setFormData(emptyAnimal);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-lg">
            <Stethoscope className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gyvūnų registras</h2>
            <p className="text-sm text-gray-600">Valdyti gyvūnų įrašus ir savininkų informaciją</p>
          </div>
        </div>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Pridėti gyvūną
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Naujas gyvūnas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Ženklo numeris *"
              value={formData.tag_no}
              onChange={(e) => setFormData({ ...formData, tag_no: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <input
              type="text"
              placeholder="Rūšis"
              value={formData.species}
              onChange={(e) => setFormData({ ...formData, species: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <select
              value={formData.sex}
              onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Pasirinkite lytį...</option>
              <option value="male">Patinas</option>
              <option value="female">Patelė</option>
            </select>

            <input
              type="number"
              placeholder="Amžius (mėn.)"
              value={formData.age_months}
              onChange={(e) => setFormData({ ...formData, age_months: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <input
              type="text"
              placeholder="Savininko vardas"
              value={formData.holder_name}
              onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <input
              type="text"
              placeholder="Savininko adresas"
              value={formData.holder_address}
              onChange={(e) => setFormData({ ...formData, holder_address: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Atšaukti
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Išsaugoti gyvūną
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ženklo nr.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rūšis</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lytis</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amžius</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Savininkas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Veiksmai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {animals.map((animal) => (
                <tr key={animal.id} className="hover:bg-gray-50 transition-colors">
                  {editing === animal.id ? (
                    <>
                      <td className="px-6 py-4" colSpan={6}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input
                            type="text"
                            value={formData.tag_no}
                            onChange={(e) => setFormData({ ...formData, tag_no: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="Ženklo numeris"
                          />
                          <input
                            type="text"
                            value={formData.species}
                            onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="Rūšis"
                          />
                          <select
                            value={formData.sex}
                            onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="">Select sex...</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                          <input
                            type="number"
                            value={formData.age_months}
                            onChange={(e) => setFormData({ ...formData, age_months: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="Amžius (mėn.)"
                          />
                          <input
                            type="text"
                            value={formData.holder_name}
                            onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="Savininko vardas"
                          />
                          <input
                            type="text"
                            value={formData.holder_address}
                            onChange={(e) => setFormData({ ...formData, holder_address: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="Savininko adresas"
                          />
                        </div>
                        <div className="flex justify-end gap-2 mt-3">
                          <button
                            onClick={handleCancel}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleSave}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 font-medium text-gray-900">{animal.tag_no || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{animal.species}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{animal.sex || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {animal.age_months ? `${animal.age_months} mėn.` : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{animal.holder_name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{animal.holder_address || ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleEdit(animal)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
