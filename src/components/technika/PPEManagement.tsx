import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { HardHat, Plus, Search, User, Package } from 'lucide-react';

interface PPEItem {
  id: string;
  ppe_type: string;
  size: string;
  quantity_on_hand: number;
  min_stock_level: number;
  product: {
    name: string;
  };
}

interface PPEIssuance {
  id: string;
  issue_date: string;
  quantity_issued: number;
  expected_return_date: string;
  actual_return_date: string | null;
  employee: {
    full_name: string;
  };
  product: {
    name: string;
  };
}

interface Employee {
  id: string;
  full_name: string;
}

export function PPEManagement() {
  const { user, logAction } = useAuth();
  const [items, setItems] = useState<PPEItem[]>([]);
  const [issuances, setIssuances] = useState<PPEIssuance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({
    ppe_item_id: '',
    employee_id: '',
    quantity_issued: '1',
    issue_date: new Date().toISOString().split('T')[0],
    expected_return_date: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [itemsRes, issuancesRes, employeesRes] = await Promise.all([
      supabase
        .from('ppe_items')
        .select('*, product:equipment_products(name)')
        .order('product(name)'),
      supabase
        .from('ppe_issuance_records')
        .select(`
          *,
          employee:users(full_name),
          product:equipment_products(name)
        `)
        .is('actual_return_date', null)
        .order('issue_date', { ascending: false })
        .limit(20),
      supabase
        .from('users')
        .select('id, full_name')
        .order('full_name'),
    ]);

    if (itemsRes.data) setItems(itemsRes.data as any);
    if (issuancesRes.data) setIssuances(issuancesRes.data as any);
    if (employeesRes.data) setEmployees(employeesRes.data);
  };

  const filteredItems = items.filter(item =>
    item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.ppe_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ppeTypeLabels: any = {
    helmet: 'Šalmas',
    gloves: 'Pirštinės',
    boots: 'Batai',
    coverall: 'Kombinezons',
    vest: 'Liemenė',
    mask: 'Kaukė',
    goggles: 'Akiniai',
    ear_protection: 'Ausų apsauga',
    other: 'Kita',
  };

  const handleIssuePPE = async () => {
    if (!issueForm.ppe_item_id || !issueForm.employee_id) {
      alert('Prašome pasirinkti PPE elementą ir darbuotoją');
      return;
    }

    const quantity = parseFloat(issueForm.quantity_issued);
    if (quantity <= 0) {
      alert('Kiekis turi būti didesnis už 0');
      return;
    }

    const selectedItem = items.find(item => item.id === issueForm.ppe_item_id);
    if (!selectedItem) {
      alert('PPE elementas nerastas');
      return;
    }

    if (quantity > selectedItem.quantity_on_hand) {
      alert(`Nepakankamas kiekis. Sandėlyje: ${selectedItem.quantity_on_hand}`);
      return;
    }

    try {
      const { error: issueError } = await supabase.from('ppe_issuance_records').insert({
        ppe_item_id: issueForm.ppe_item_id,
        product_id: selectedItem.product_id,
        employee_id: issueForm.employee_id,
        issue_date: issueForm.issue_date,
        quantity_issued: quantity,
        expected_return_date: issueForm.expected_return_date || null,
        issued_by: user?.id,
        notes: issueForm.notes || null,
      });

      if (issueError) throw issueError;

      const { error: updateError } = await supabase
        .from('ppe_items')
        .update({
          quantity_on_hand: selectedItem.quantity_on_hand - quantity,
        })
        .eq('id', issueForm.ppe_item_id);

      if (updateError) throw updateError;

      await logAction('issue_ppe', {
        ppe_item_id: issueForm.ppe_item_id,
        employee_id: issueForm.employee_id,
        quantity: quantity,
      });

      setShowIssueModal(false);
      setIssueForm({
        ppe_item_id: '',
        employee_id: '',
        quantity_issued: '1',
        issue_date: new Date().toISOString().split('T')[0],
        expected_return_date: '',
        notes: '',
      });
      loadData();
      alert('PPE sėkmingai išduotas');
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Klaida išduodant PPE: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">PPE atsargos</h3>
          <button
            onClick={() => setShowIssueModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Išduoti PPE
          </button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Ieškoti PPE..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className={`border rounded-lg p-4 ${
                item.quantity_on_hand <= item.min_stock_level
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <HardHat className="w-5 h-5 text-slate-600" />
                  <span className="font-medium text-gray-800">{ppeTypeLabels[item.ppe_type]}</span>
                </div>
                {item.quantity_on_hand <= item.min_stock_level && (
                  <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">Mažos atsargos</span>
                )}
              </div>

              <h4 className="font-medium text-gray-800 mb-2">{item.product.name}</h4>

              <div className="space-y-1 text-sm text-gray-600 mb-3">
                {item.size && <p>Dydis: {item.size}</p>}
                <p className="font-semibold">Sandėlyje: {item.quantity_on_hand}</p>
                <p>Min. lygis: {item.min_stock_level}</p>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    item.quantity_on_hand <= item.min_stock_level ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{
                    width: `${Math.min(100, (item.quantity_on_hand / (item.min_stock_level * 2)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Paskutiniai išdavimai</h3>
        <div className="space-y-2">
          {issuances.map(issuance => (
            <div key={issuance.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-4">
                <User className="w-8 h-8 text-slate-600" />
                <div>
                  <p className="font-medium text-gray-800">{issuance.employee.full_name}</p>
                  <p className="text-sm text-gray-600">
                    {issuance.product.name} · {issuance.quantity_issued} vnt.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Išduota: {issuance.issue_date}</p>
                {issuance.expected_return_date && (
                  <p className="text-sm text-amber-600">Grąžinti iki: {issuance.expected_return_date}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="PPE tipų" value={items.length.toString()} color="blue" />
        <StatCard
          title="Viso vienetų"
          value={items.reduce((sum, item) => sum + item.quantity_on_hand, 0).toString()}
          color="green"
        />
        <StatCard
          title="Mažos atsargos"
          value={items.filter(item => item.quantity_on_hand <= item.min_stock_level).length.toString()}
          color="red"
        />
        <StatCard title="Išduota" value={issuances.length.toString()} color="amber" />
      </div>

      {showIssueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Išduoti PPE</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PPE elementas *</label>
                <select
                  value={issueForm.ppe_item_id}
                  onChange={(e) => setIssueForm({ ...issueForm, ppe_item_id: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Pasirinkite PPE</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.product.name} - {ppeTypeLabels[item.ppe_type]} ({item.quantity_on_hand} sandėlyje)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Darbuotojas *</label>
                <select
                  value={issueForm.employee_id}
                  onChange={(e) => setIssueForm({ ...issueForm, employee_id: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Pasirinkite darbuotoją</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kiekis *</label>
                  <input
                    type="number"
                    min="1"
                    value={issueForm.quantity_issued}
                    onChange={(e) => setIssueForm({ ...issueForm, quantity_issued: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Išdavimo data *</label>
                  <input
                    type="date"
                    value={issueForm.issue_date}
                    onChange={(e) => setIssueForm({ ...issueForm, issue_date: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grąžinimo data (jei taikoma)</label>
                <input
                  type="date"
                  value={issueForm.expected_return_date}
                  onChange={(e) => setIssueForm({ ...issueForm, expected_return_date: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pastabos</label>
                <textarea
                  value={issueForm.notes}
                  onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowIssueModal(false);
                  setIssueForm({
                    ppe_item_id: '',
                    employee_id: '',
                    quantity_issued: '1',
                    issue_date: new Date().toISOString().split('T')[0],
                    expected_return_date: '',
                    notes: '',
                  });
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Atšaukti
              </button>
              <button
                onClick={handleIssuePPE}
                className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700"
              >
                Išduoti PPE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
