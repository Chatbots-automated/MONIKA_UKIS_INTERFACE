// n8n Code node - Transform parsed GEA data for database upload
// This node transforms the output from the parser into the format expected by gea_daily_upload()
// Place this node AFTER the parser node and BEFORE the Supabase HTTP Request node

const output = [];

for (const item of $input.all()) {
  const parsed = item.json;

  // Extract the parsed reports
  const report1 = parsed.report_1_reproduction_status?.rows || [];
  const report2 = parsed.report_2_milk_production?.rows || [];
  const report3 = parsed.report_3_insemination_lactation?.rows || [];

  // Transform report 1: Map field names to database schema
  const ataskaita1 = report1.map(row => ({
    cow_number: row.cow_number?.toString() || null,
    ear_number: row.ear_number || null,
    cow_state: row.status || null,  // status → cow_state
    group_number: row.group_number?.toString() || null,
    pregnant_since: row.calving_action_date || null,  // calving_action_date → pregnant_since
    lactation_days: row.lactation_days || null,
    inseminated_at: row.insemination_action_date || null,  // insemination_action_date → inseminated_at
    pregnant_days: row.pregnancy_days || null,
    next_pregnancy_date: row.expected_calving_date || null,  // expected_calving_date → next_pregnancy_date
    days_until_waiting_pregnancy: row.days_until_expected_calving || null  // days_until_expected_calving → days_until_waiting_pregnancy
  }));

  // Transform report 2: Map field names and convert milk_readings array
  const ataskaita2 = report2.map(row => {
    // Convert milk_readings array to individual milking fields (milking_date_1, milking_time_1, etc.)
    const milkingFields = {};
    
    if (Array.isArray(row.milk_readings)) {
      row.milk_readings.forEach((reading, index) => {
        const num = reading.reading_index || (index + 1);
        milkingFields[`milking_date_${num}`] = reading.milking_date || null;
        milkingFields[`milking_time_${num}`] = reading.milking_time || null;
        milkingFields[`milking_weight_${num}`] = reading.milk_quantity || null;
      });
    }

    return {
      cow_number: row.cow_number?.toString() || null,
      genetic_worth: row.breeding_value_by_milk_vpp || null,  // breeding_value_by_milk_vpp → genetic_worth
      blood_line: row.blood_line || null,
      avg_milk_prod_weight: row.average_daily_milk || null,  // average_daily_milk → avg_milk_prod_weight
      produce_milk: row.in_milk_production ? 'Taip' : 'Ne',  // Convert boolean to "Taip"/"Ne"
      ...milkingFields  // Spread the individual milking fields
    };
  });

  // Transform report 3: Map field names
  const ataskaita3 = report3.map(row => ({
    cow_number: row.cow_number?.toString() || null,
    teat_missing_right_back: row.missing_teat_1 === 1 ? 'Taip' : 'Ne',  // Convert 0/1 to "Taip"/"Ne"
    teat_missing_back_left: row.missing_teat_2 === 1 ? 'Taip' : 'Ne',
    teat_missing_front_left: row.missing_teat_3 === 1 ? 'Taip' : 'Ne',
    teat_missing_front_right: row.missing_teat_4 === 1 ? 'Taip' : 'Ne',
    insemination_count: row.insemination_count_current_lactation_3_day_rule || null,  // insemination_count_current_lactation_3_day_rule → insemination_count
    bull_1: row.insemination_bull_1 || null,
    bull_2: row.insemination_bull_2 || null,
    bull_3: row.insemination_bull_3 || null,
    lactation_number: row.lactation_number || null
  }));

  // Build the payload in the format expected by gea_daily_upload()
  const payload = {
    meta: {
      counts: {
        ataskaita1: ataskaita1.length,
        ataskaita2: ataskaita2.length,
        ataskaita3: ataskaita3.length
      },
      markers: {
        i1: 1,
        i2: 2,
        i3: 3
      }
    },
    ataskaita1: ataskaita1,
    ataskaita2: ataskaita2,
    ataskaita3: ataskaita3
  };

  output.push({
    json: {
      payload: payload,
      original_file_type: parsed.file_type,
      parsed_at: parsed.parsed_at,
      source_counts: {
        report_1: report1.length,
        report_2: report2.length,
        report_3: report3.length
      }
    }
  });
}

return output;
