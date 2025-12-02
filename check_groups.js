const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

(async () => {
  let allData = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('gea_daily')
      .select('grupe')
      .range(from, from + pageSize - 1);
    
    if (error) {
      console.error('Error:', error);
      break;
    }
    
    if (data && data.length > 0) {
      allData = allData.concat(data);
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }
  
  const groupSet = new Set();
  allData.forEach(d => {
    if (d.grupe != null) {
      groupSet.add(d.grupe);
    }
  });
  
  const uniqueGroups = Array.from(groupSet).sort((a, b) => a - b);
  console.log('All unique groups:', uniqueGroups);
})();
