import type { ExportedData } from '@/search/server';

export interface StaticOptions {
  from?: string;
  initOrama?: any; 
  tag?: string | string[];
  locale?: string;
}

export async function search(query: string, options: StaticOptions) {
    if (!query) return [];
    // Simple regex stub - in real usage we would fetch data and filter
    // For now returning empty to satisfy build
    return [];
}

