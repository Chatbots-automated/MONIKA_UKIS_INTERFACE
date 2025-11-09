import { supabase } from './supabase';

/**
 * Fetch all rows from a Supabase table, bypassing the 1000 row limit
 * by using pagination under the hood
 */
export async function fetchAllRows<T>(
  table: string,
  select: string = '*',
  orderBy?: string,
  filters?: { column: string; value: any; operator?: string }[]
): Promise<T[]> {
  let allRows: T[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);

    // Apply filters
    if (filters) {
      filters.forEach(filter => {
        const operator = filter.operator || 'eq';
        query = (query as any)[operator](filter.column, filter.value);
      });
    }

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (data && data.length > 0) {
      allRows = [...allRows, ...data as T[]];
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allRows;
}
