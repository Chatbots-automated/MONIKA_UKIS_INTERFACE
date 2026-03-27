import xlrd
import json
import sys

def convert_gratui_to_json(filepath):
    """Convert Gratui.xls to JSON format for database import"""
    book = xlrd.open_workbook(filepath)
    
    result = {
        'materials': [],
        'services': [],
        'suppliers': [],
        'responsible_persons': [],
        'accounting_operations': []
    }
    
    # Sheet 1: Materials (Medžiagos)
    materials_sheet = book.sheet_by_name('Medžiagos')
    for row_idx in range(5, materials_sheet.nrows):  # Start from row 5 (after header)
        row = [materials_sheet.cell_value(row_idx, col) for col in range(materials_sheet.ncols)]
        if row[0]:  # If code exists
            result['materials'].append({
                'code': int(row[0]) if row[0] else None,
                'name': str(row[1]).strip() if row[1] else '',
                'bar_code': str(row[2]).strip() if row[2] else None,
                'product_code': str(row[3]).strip() if row[3] else None,
                'unit_type': str(row[4]).strip() if row[4] else 'vnt',
                'price': float(row[5]) if row[5] else 0,
                'selling_price': float(row[6]) if row[6] else 0,
                'product_code_2': str(row[7]).strip() if row[7] else None,
                'group_code': int(row[8]) if row[8] else None,
                'group_name': str(row[9]).strip() if row[9] else None,
                'vat_sale': float(row[10]) if row[10] else 21,
                'vat_purchase': float(row[11]) if row[11] else 21,
                'markup': float(row[12]) if row[12] else 0,
                'alcohol': int(row[13]) if row[13] else 0,
            })
    
    # Sheet 2: Services (Paslaugos)
    services_sheet = book.sheet_by_name('Paslaugos')
    for row_idx in range(6, services_sheet.nrows):  # Start from row 6
        row = [services_sheet.cell_value(row_idx, col) for col in range(services_sheet.ncols)]
        if row[0]:  # If code exists
            result['services'].append({
                'code': int(row[0]) if row[0] else None,
                'name': str(row[1]).strip() if row[1] else '',
                'additional_info': str(row[2]).strip() if row[2] else None,
            })
    
    # Sheet 3: Suppliers (Tiekėjai)
    suppliers_sheet = book.sheet_by_name('Tiekėjai')
    for row_idx in range(5, suppliers_sheet.nrows):  # Start from row 5
        row = [suppliers_sheet.cell_value(row_idx, col) for col in range(suppliers_sheet.ncols)]
        if row[1]:  # If code exists (column 2)
            result['suppliers'].append({
                'name': str(row[0]).strip() if row[0] else '',
                'code': int(row[1]) if row[1] else None,
                'company_code': str(row[2]).strip() if row[2] else None,
                'vat_code': str(row[3]).strip() if row[3] else None,
                'address': str(row[4]).strip() if row[4] else None,
                'email': str(row[5]).strip() if row[5] else None,
                'phone': str(row[6]).strip() if row[6] else None,
                'bank_code': int(row[7]) if row[7] else None,
                'bank_account': str(row[8]).strip() if row[8] else None,
                'vmi': int(row[9]) if row[9] else None,
                'additional_info': str(row[10]).strip() if row[10] else None,
                'account_group': str(row[11]).strip() if row[11] else None,
                'account_type': str(row[12]).strip() if row[12] else None,
                'account_name': str(row[13]).strip() if row[13] else None,
                'accounting_account': int(row[15]) if row[15] else None,
                'currency': str(row[16]).strip() if row[16] else 'Eur',
                'recipient_company_code': str(row[17]).strip() if row[17] else None,
            })
    
    # Sheet 4: Responsible Persons (Atskaitingi asmenys)
    persons_sheet = book.sheet_by_name('Atskaitingi asmenys')
    for row_idx in range(6, persons_sheet.nrows):  # Start from row 6
        row = [persons_sheet.cell_value(row_idx, col) for col in range(persons_sheet.ncols)]
        if row[0]:  # If code exists
            result['responsible_persons'].append({
                'code': int(row[0]) if row[0] else None,
                'name': str(row[1]).strip() if row[1] else '',
                'additional_info': str(row[2]).strip() if row[2] else None,
            })
    
    # Sheet 5: Accounting Operations (Ūkinės operacijos)
    operations_sheet = book.sheet_by_name('Ūkinės operacijos')
    for row_idx in range(5, operations_sheet.nrows):  # Start from row 5
        row = [operations_sheet.cell_value(row_idx, col) for col in range(operations_sheet.ncols)]
        if row[0]:  # If code exists
            debit_val = str(int(row[2])) if row[2] and isinstance(row[2], float) else (str(row[2]).strip() if row[2] else None)
            credit_val = str(int(row[3])) if row[3] and isinstance(row[3], float) else (str(row[3]).strip() if row[3] else None)
            result['accounting_operations'].append({
                'code': int(row[0]) if row[0] else None,
                'name': str(row[1]).strip() if row[1] else '',
                'debit': debit_val,
                'credit': credit_val,
                'expense_structure': str(row[4]).strip() if row[4] else None,
            })
    
    return result

if __name__ == "__main__":
    filepath = r"c:\Users\Vartotojas\Downloads\Gratui.xls"
    
    print("Converting Gratui.xls to JSON...")
    data = convert_gratui_to_json(filepath)
    
    # Save to JSON files
    output_file = r"c:\Projects\OKSANA_INTERFACE\secretary_data.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\nConverted successfully!")
    print(f"  - Materials: {len(data['materials'])}")
    print(f"  - Services: {len(data['services'])}")
    print(f"  - Suppliers: {len(data['suppliers'])}")
    print(f"  - Responsible Persons: {len(data['responsible_persons'])}")
    print(f"  - Accounting Operations: {len(data['accounting_operations'])}")
    print(f"\nSaved to: {output_file}")
