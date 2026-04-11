// Utility for exporting write-off acts to Excel format
// Matches the official "Nurašymo aktas" template

interface WriteOffActExport {
  act_number: string;
  act_date: string;
  period_start: string;
  period_end: string;
  department: string | null;
  module: string;
  total_amount: number;
  items: WriteOffActItemExport[];
}

interface WriteOffActItemExport {
  product_name: string;
  product_code: string | null;
  category_name: string | null;
  unit_type: string;
  quantity_used: number;
  unit_price: number;
  total_price: number;
  batch_number: string | null;
  line_number: number | null;
  received_qty?: number;
  qty_remaining?: number;
}

export async function exportWriteOffActToExcel(act: WriteOffActExport): Promise<void> {
  try {
    // Dynamic import to reduce bundle size
    const XLSX = await import('xlsx');

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Company header
    const companyName = 'ŪB "Beržėnai"';
    const companyAddress = 'Naujamiestio g. 27, Degionių k., Panevėžio r.';
    const companyCode = 'Įmonės kodas 168536660';

    // Prepare data array
    const data: any[][] = [];

    // Header rows
    data.push([companyName]);
    data.push([companyAddress]);
    data.push([companyCode]);
    data.push([]);
    data.push([]);
    data.push([]);
    data.push(['', '', `Nurašymo aktas Nr. ${act.act_number}`]);
    data.push([]);
    data.push([]);
    data.push(['', '', `${new Date(act.act_date).toLocaleDateString('lt-LT')}`]);
    data.push(['', '', '', '(Data)']);
    data.push([act.department || 'Padalinys nenurodytas']);
    data.push([]);

    // Table header
    data.push(['Eil. Nr.', 'Pavadinimas', '', 'Mato vnt.', 'Kiekis', 'Kaina', 'Suma']);

    // Group items by category
    const itemsByCategory: Record<string, WriteOffActItemExport[]> = {};
    act.items.forEach(item => {
      const category = item.category_name || 'Kita';
      if (!itemsByCategory[category]) {
        itemsByCategory[category] = [];
      }
      itemsByCategory[category].push(item);
    });

    let lineNum = 1;
    let grandTotal = 0;

    // Add items by category
    Object.entries(itemsByCategory).forEach(([category, items]) => {
      // Category header
      data.push(['', category]);

      let categoryTotal = 0;

      items.forEach(item => {
        data.push([
          lineNum++,
          item.product_name,
          item.product_code || '',
          item.unit_type,
          item.quantity_used,
          item.unit_price.toFixed(2),
          item.total_price.toFixed(2)
        ]);
        categoryTotal += item.total_price;
      });

      // Category subtotal
      data.push(['', 'Viso:', '', '', '', '', categoryTotal.toFixed(2)]);
      data.push([]);

      grandTotal += categoryTotal;
    });

    // Grand total
    data.push(['', '', '', '', '', 'Iš viso:', grandTotal.toFixed(2)]);
    data.push([]);
    data.push([]);

    // Footer info
    data.push([`Periodas: ${new Date(act.period_start).toLocaleDateString('lt-LT')} - ${new Date(act.period_end).toLocaleDateString('lt-LT')}`]);
    data.push([`Modulis: ${act.module === 'technika' ? 'Technika' : 'Veterinarija'}`]);

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 8 },   // Eil. Nr.
      { wch: 40 },  // Pavadinimas
      { wch: 15 },  // Product code
      { wch: 10 },  // Mato vnt.
      { wch: 10 },  // Kiekis
      { wch: 10 },  // Kaina
      { wch: 12 }   // Suma
    ];

    // Merge cells for header
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push(
      { s: { r: 6, c: 2 }, e: { r: 6, c: 6 } }, // Act number
      { s: { r: 9, c: 2 }, e: { r: 9, c: 6 } }  // Date
    );

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Nurašymo aktas');

    // Generate filename
    const filename = `Nurasymo_aktas_${act.act_number.replace(/\//g, '-')}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Write file
    XLSX.writeFile(wb, filename);

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Nepavyko eksportuoti į Excel');
  }
}

// Alternative: Export to CSV (simpler, no dependencies)
export function exportWriteOffActToCSV(act: WriteOffActExport): void {
  const lines: string[] = [];

  // Header
  lines.push(`Nurašymo aktas Nr. ${act.act_number}`);
  lines.push(`Data: ${new Date(act.act_date).toLocaleDateString('lt-LT')}`);
  lines.push(`Periodas: ${new Date(act.period_start).toLocaleDateString('lt-LT')} - ${new Date(act.period_end).toLocaleDateString('lt-LT')}`);
  lines.push(`Padalinys: ${act.department || 'Nenurodytas'}`);
  lines.push('');

  // Table header with stock info
  lines.push('Eil. Nr.,Pavadinimas,Kodas,Partija,Kategorija,Mato vnt.,Panaudota,Likutis,Gauta iš viso,Vnt. kaina,Suma');

  // Group items by category
  const itemsByCategory: Record<string, WriteOffActItemExport[]> = {};
  act.items.forEach(item => {
    const category = item.category_name || 'Kita';
    if (!itemsByCategory[category]) {
      itemsByCategory[category] = [];
    }
    itemsByCategory[category].push(item);
  });

  let lineNum = 1;
  let grandTotal = 0;
  let grandTotalUsed = 0;
  let grandTotalRemaining = 0;

  // Add items by category
  Object.entries(itemsByCategory).forEach(([category, items]) => {
    lines.push('');
    lines.push(`"${category}"`);

    let categoryTotal = 0;
    let categoryUsed = 0;
    let categoryRemaining = 0;

    items.forEach(item => {
      lines.push([
        lineNum++,
        `"${item.product_name}"`,
        `"${item.product_code || ''}"`,
        `"${item.batch_number || '-'}"`,
        `"${category}"`,
        item.unit_type,
        item.quantity_used.toFixed(2),
        (item.qty_remaining || 0).toFixed(2),
        (item.received_qty || 0).toFixed(2),
        item.unit_price.toFixed(2),
        item.total_price.toFixed(2)
      ].join(','));
      categoryTotal += item.total_price;
      categoryUsed += item.quantity_used;
      categoryRemaining += (item.qty_remaining || 0);
    });

    lines.push(`"","Viso:","","","","",${categoryUsed.toFixed(2)},${categoryRemaining.toFixed(2)},"","",${categoryTotal.toFixed(2)}`);
    grandTotal += categoryTotal;
    grandTotalUsed += categoryUsed;
    grandTotalRemaining += categoryRemaining;
  });

  lines.push('');
  lines.push(`"","","","","","Iš viso:",${grandTotalUsed.toFixed(2)},${grandTotalRemaining.toFixed(2)},"","",${grandTotal.toFixed(2)}`);

  // Create blob and download
  const csvContent = lines.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const filename = `Nurasymo_aktas_${act.act_number.replace(/\//g, '-')}_${new Date().toISOString().split('T')[0]}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
