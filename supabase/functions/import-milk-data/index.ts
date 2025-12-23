import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ScrapedMilkData {
  scraped_at: string;
  url: string;
  range: {
    from: string;
    to: string;
  };
  results: {
    [gamintojo_id: string]: ScrapedProducerData;
  };
}

interface ScrapedProducerData {
  gamintojo_id: string;
  label: string;
  meta: {
    imone: string;
    rajonas: string;
    punktas: string;
    gamintojas: string;
    periodas: {
      nuo: string;
      iki: string;
    };
  };
  tables: {
    pieno_sudeties_tyrimai: ScrapedTableData<ScrapedCompositionRow>;
    pieno_kokybes_tyrimai: ScrapedTableData<ScrapedQualityRow>;
  };
}

interface ScrapedTableData<T> {
  title: string;
  key: string;
  columns: Array<{ key: string; label: string }>;
  rows: T[];
  summary?: Array<Record<string, any>>;
}

interface ScrapedCompositionRow {
  paemimo_data: string;
  atvezimo_data: string;
  tyrimo_data: string;
  riebalu_kiekis: number;
  baltymu_kiekis: number;
  laktozes_kiekis: number;
  persk_koef: number;
  ureja_mg_100ml: number;
  ph: number;
  pastaba: string;
  konteineris: string;
  plomba: string;
  prot_nr: string;
}

interface ScrapedQualityRow {
  paemimo_data: string;
  atvezimo_data: string;
  tyrimo_data: string;
  somatiniu_lasteliu_skaicius_tukst_ml: number;
  bendras_bakteriju_skaicius_tukst_ml: number;
  neatit_pstsls_isk_l_bbs_isk_l: string;
  konteineris: string;
  plomba: string;
  prot_nr: string;
}

function parseDate(dateStr: string): string {
  if (!dateStr) return dateStr;

  // YYYYMMDD -> YYYY-MM-DD
  if (/^\d{8}$/.test(dateStr)) {
    return `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
  }

  // YY.MM.DD or YYYY.MM.DD -> YYYY-MM-DD
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return dateStr;
}

async function upsertProducer(
  supabase: any,
  userId: string,
  gamintojo_id: string,
  producerData: ScrapedProducerData
): Promise<string | null> {
  const { data, error } = await supabase
    .from('milk_producers')
    .upsert({
      user_id: userId,
      gamintojo_id: gamintojo_id,
      label: producerData.label,
      imone: producerData.meta.imone,
      rajonas: producerData.meta.rajonas,
      punktas: producerData.meta.punktas,
      gamintojas: producerData.meta.gamintojas,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,gamintojo_id',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error upserting producer:', error);
    throw new Error(`Failed to upsert producer: ${error.message}`);
  }

  return data?.id || null;
}

async function importCompositionTests(
  supabase: any,
  producerId: string,
  producerData: ScrapedProducerData
): Promise<number> {
  const rows = producerData.tables.pieno_sudeties_tyrimai.rows;

  if (!rows || rows.length === 0) {
    return 0;
  }

  const testRecords = rows.map(row => ({
    producer_id: producerId,
    paemimo_data: parseDate(row.paemimo_data),
    atvezimo_data: parseDate(row.atvezimo_data),
    tyrimo_data: parseDate(row.tyrimo_data),
    riebalu_kiekis: row.riebalu_kiekis || null,
    baltymu_kiekis: row.baltymu_kiekis || null,
    laktozes_kiekis: row.laktozes_kiekis || null,
    persk_koef: row.persk_koef || null,
    ureja_mg_100ml: row.ureja_mg_100ml || null,
    ph: row.ph || null,
    pastaba: row.pastaba || '',
    konteineris: row.konteineris || '',
    plomba: row.plomba || '',
    prot_nr: row.prot_nr || '',
  }));

  const { error } = await supabase
    .from('pieno_sudeties_tyrimai')
    .upsert(testRecords, {
      onConflict: 'producer_id,paemimo_data,tyrimo_data,konteineris',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Error importing composition tests:', error);
    throw new Error(`Failed to import composition tests: ${error.message}`);
  }

  return testRecords.length;
}

async function importQualityTests(
  supabase: any,
  producerId: string,
  producerData: ScrapedProducerData
): Promise<number> {
  const rows = producerData.tables.pieno_kokybes_tyrimai.rows;

  if (!rows || rows.length === 0) {
    return 0;
  }

  const testRecords = rows.map(row => ({
    producer_id: producerId,
    paemimo_data: parseDate(row.paemimo_data),
    atvezimo_data: parseDate(row.atvezimo_data),
    tyrimo_data: parseDate(row.tyrimo_data),
    somatiniu_lasteliu_skaicius: row.somatiniu_lasteliu_skaicius_tukst_ml || null,
    bendras_bakteriju_skaicius: row.bendras_bakteriju_skaicius_tukst_ml || null,
    neatit_pst: row.neatit_pstsls_isk_l_bbs_isk_l || '',
    konteineris: row.konteineris || '',
    plomba: row.plomba || '',
    prot_nr: row.prot_nr || '',
  }));

  const { error } = await supabase
    .from('pieno_kokybes_tyrimai')
    .upsert(testRecords, {
      onConflict: 'producer_id,paemimo_data,tyrimo_data,konteineris',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Error importing quality tests:', error);
    throw new Error(`Failed to import quality tests: ${error.message}`);
  }

  return testRecords.length;
}

async function logScrapeOperation(
  supabase: any,
  userId: string,
  scrapedData: ScrapedMilkData,
  producersCount: number,
  compositionTests: number,
  qualityTests: number
): Promise<void> {
  const { error } = await supabase
    .from('milk_scrape_logs')
    .insert({
      user_id: userId,
      scraped_at: scrapedData.scraped_at,
      url: scrapedData.url,
      date_from: parseDate(scrapedData.range.from),
      date_to: parseDate(scrapedData.range.to),
      producers_count: producersCount,
      records_imported: {
        producers: producersCount,
        composition_tests: compositionTests,
        quality_tests: qualityTests,
      },
    });

  if (error) {
    console.error('Error logging scrape operation:', error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const scrapedData: ScrapedMilkData = await req.json();

    if (!scrapedData.results || typeof scrapedData.results !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid data format. Expected "results" object.' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    let totalCompositionTests = 0;
    let totalQualityTests = 0;
    let totalProducers = 0;
    const errors: string[] = [];

    for (const [gamintojo_id, producerData] of Object.entries(scrapedData.results)) {
      try {
        const producerId = await upsertProducer(supabase, user.id, gamintojo_id, producerData);

        if (!producerId) {
          errors.push(`Failed to upsert producer ${gamintojo_id}`);
          continue;
        }

        totalProducers++;

        const compositionCount = await importCompositionTests(supabase, producerId, producerData);
        totalCompositionTests += compositionCount;

        const qualityCount = await importQualityTests(supabase, producerId, producerData);
        totalQualityTests += qualityCount;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Producer ${gamintojo_id}: ${errorMsg}`);
      }
    }

    await logScrapeOperation(
      supabase,
      user.id,
      scrapedData,
      totalProducers,
      totalCompositionTests,
      totalQualityTests
    );

    return new Response(
      JSON.stringify({
        success: true,
        imported: {
          producers: totalProducers,
          compositionTests: totalCompositionTests,
          qualityTests: totalQualityTests,
        },
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});