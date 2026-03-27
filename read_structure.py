import xlrd
import sys

file_path = sys.argv[1] if len(sys.argv) > 1 else 'Importas_struktura(865).xls'

workbook = xlrd.open_workbook(file_path)

print(f"\nFile: {file_path}")
print(f"Number of sheets: {workbook.nsheets}")
print("\nSheet names:")
for sheet_name in workbook.sheet_names():
    print(f"  - {sheet_name}")

for sheet_name in workbook.sheet_names():
    sheet = workbook.sheet_by_name(sheet_name)
    print(f"\n{'='*80}")
    print(f"Sheet: {sheet_name}")
    print(f"{'='*80}")
    print(f"Rows: {sheet.nrows}, Columns: {sheet.ncols}\n")
    
    for row_idx in range(min(sheet.nrows, 100)):
        row_data = []
        for col_idx in range(sheet.ncols):
            cell = sheet.cell(row_idx, col_idx)
            if cell.value:
                row_data.append(str(cell.value))
        
        if row_data:
            print(f"Row {row_idx + 1}: {' | '.join(row_data)}")
