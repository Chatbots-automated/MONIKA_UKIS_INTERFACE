import json

def escape_sql_string(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"

with open('secretary_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

output_file = 'supabase/migrations/20260326000003_secretary_data_insert.sql'

with open(output_file, 'w', encoding='utf-8') as out:
    out.write("-- Secretary System Data Import - Part 3: Insert Reference Data\n\n")
    
    out.write("-- Materials\n")
    for item in data['materials']:
        cols = ['code', 'name', 'bar_code', 'product_code', 'unit_type', 'price', 
                'selling_price', 'product_code_2', 'group_code', 'group_name', 
                'vat_sale', 'vat_purchase', 'markup', 'alcohol']
        values = [escape_sql_string(item.get(col)) for col in cols]
        out.write(f"INSERT INTO public.secretary_materials ({', '.join(cols)}) VALUES ({', '.join(values)}) ON CONFLICT (code) DO NOTHING;\n")
    
    out.write("\n-- Services\n")
    for item in data['services']:
        cols = ['code', 'name', 'additional_info']
        values = [escape_sql_string(item.get(col)) for col in cols]
        out.write(f"INSERT INTO public.secretary_services ({', '.join(cols)}) VALUES ({', '.join(values)}) ON CONFLICT (code) DO NOTHING;\n")
    
    out.write("\n-- Suppliers\n")
    for item in data['suppliers']:
        cols = ['code', 'name', 'company_code', 'vat_code', 'address', 'email', 
                'phone', 'bank_code', 'bank_account', 'vmi', 'additional_info', 
                'account_group', 'account_type', 'account_name', 'accounting_account', 
                'currency', 'recipient_company_code']
        values = [escape_sql_string(item.get(col)) for col in cols]
        out.write(f"INSERT INTO public.secretary_suppliers ({', '.join(cols)}) VALUES ({', '.join(values)}) ON CONFLICT (code) DO NOTHING;\n")
    
    out.write("\n-- Responsible Persons\n")
    for item in data['responsible_persons']:
        cols = ['code', 'name', 'additional_info']
        values = [escape_sql_string(item.get(col)) for col in cols]
        out.write(f"INSERT INTO public.secretary_responsible_persons ({', '.join(cols)}) VALUES ({', '.join(values)}) ON CONFLICT (code) DO NOTHING;\n")
    
    out.write("\n-- Accounting Operations\n")
    for item in data['accounting_operations']:
        cols = ['code', 'name', 'debit', 'credit', 'expense_structure']
        values = [escape_sql_string(item.get(col)) for col in cols]
        out.write(f"INSERT INTO public.secretary_accounting_operations ({', '.join(cols)}) VALUES ({', '.join(values)}) ON CONFLICT (code) DO NOTHING;\n")

print(f"SQL file generated: {output_file}")
print(f"Total records: {len(data['materials'])} materials, {len(data['services'])} services, {len(data['suppliers'])} suppliers, {len(data['responsible_persons'])} persons, {len(data['accounting_operations'])} operations")
