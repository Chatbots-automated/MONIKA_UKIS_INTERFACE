const expectedFields = [
  'id', 'animal_id', 'tag_no', 'snapshot_date', 'collar_no', 'statusas', 'grupe',
  'milk_avg', 'm1_date', 'm1_time', 'm1_qty', 'm2_date', 'm2_time', 'm2_qty',
  'm3_date', 'm3_time', 'm3_qty', 'm4_date', 'm4_time', 'm4_qty',
  'm5_date', 'm5_time', 'm5_qty', 'in_milk', 'calved_on', 'lact_days',
  'inseminated_on', 'source', 'created_at'
];

const actualFields = [
  'id', 'animal_id', 'tag_no', 'collar_no', 'statusas', 'grupe', 'milk_avg',
  'm1_date', 'm1_time', 'm1_qty', 'm2_date', 'm2_time', 'm2_qty',
  'm3_date', 'm3_time', 'm3_qty', 'm4_date', 'm4_time', 'm4_qty',
  'm5_date', 'm5_time', 'm5_qty', 'in_milk', 'calved_on', 'lact_days',
  'inseminated_on', 'snapshot_date', 'source', 'created_at'
];

console.log('Expected fields:', expectedFields.length);
console.log('Actual fields:', actualFields.length);

const missing = expectedFields.filter(f => !actualFields.includes(f));
const extra = actualFields.filter(f => !expectedFields.includes(f));

if (missing.length > 0) {
  console.log('\nMissing fields:', missing);
} else {
  console.log('\nNo missing fields!');
}

if (extra.length > 0) {
  console.log('Extra fields:', extra);
}

console.log('\nAll fields match!');
