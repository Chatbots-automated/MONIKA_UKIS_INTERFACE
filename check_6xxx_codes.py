import json

data = json.load(open('secretary_data.json', encoding='utf-8'))
ops_6xxx = [op for op in data['accounting_operations'] if op.get('debit', '').startswith('6')]
ops_1xxx = [op for op in data['accounting_operations'] if op.get('debit', '').startswith('1')]

print(f'Operations with 6xxx debit: {len(ops_6xxx)}')
print('First 10 with 6xxx:')
for op in ops_6xxx[:10]:
    print(f"  {op['name']}: D={op['debit']} K={op['credit']}")

print(f'\nOperations with 1xxx debit: {len(ops_1xxx)}')
print('First 10 with 1xxx:')
for op in ops_1xxx[:10]:
    print(f"  {op['name']}: D={op['debit']} K={op['credit']}")

# Find 1571 specifically
op_1571 = [op for op in data['accounting_operations'] if op.get('debit') == '1571']
print(f'\n1571 operation:')
print(op_1571)
