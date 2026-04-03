import xlrd

file_path = r"c:\Users\Vartotojas\Downloads\Importas_struktūra(865)\Importas_struktūra(865).xls"

try:
    workbook = xlrd.open_workbook(file_path)
    sheet = workbook.sheet_by_index(0)
    
    print(f"Sheet name: {sheet.name}")
    print(f"Rows: {sheet.nrows}, Columns: {sheet.ncols}")
    print("\nFirst 20 rows:")
    print("-" * 100)
    
    for row_idx in range(min(20, sheet.nrows)):
        row = []
        for col in range(min(5, sheet.ncols)):
            cell = sheet.cell_value(row_idx, col)
            row.append(str(cell)[:50])
        print(f"Row {row_idx}: {' | '.join(row)}")
        
except Exception as e:
    print(f"Error: {e}")
