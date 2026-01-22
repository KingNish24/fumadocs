import type { ExportedData } from '@/search/server';
import MiniSearch, { type Options } from 'minisearch';
import { searchSimple } from '@/search/minisearch/search/simple';
import { searchAdvanced } from '@/search/minisearch/search/advanced';
import {
  advancedOptions,
  simpleOptions,
} from '@/search/minisearch/create-db';
import type { SortedResult } from '@/search';

export interface StaticOptions {
  from?: string;
  tag?: string | string[];
  locale?: string;
}

interface LoadedDB {
  db: MiniSearch;
  type: 'simple' | 'advanced';
}

const cache = new Map<string, Promise<LoadedDB>>();

async function load(url: string, locale?: string): Promise<LoadedDB> {
  const key = `${url}-${locale ?? ''}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    const exported = (await res.json()) as ExportedData;

    if (exported.type === 'i18n') {
      if (!locale) throw new Error('Locale required for i18n search');
      const data = exported.data[locale];
      if (!data) throw new Error(`Locale ${locale} not found`);
      
      return {
        db: MiniSearch.loadJSON(JSON.stringify(data.json), advancedOptions),
        type: data.type,
      } as const;
    }

    if (exported.type === 'simple') {
      return {
        db: MiniSearch.loadJSON(JSON.stringify(exported.json), simpleOptions),
        type: 'simple',
      } as const;
    }

    return {
      db: MiniSearch.loadJSON(JSON.stringify(exported.json), advancedOptions),
      type: 'advanced',
    } as const;
  })();

  cache.set(key, promise);
  return promise;
}

export async function search(
  query: string,
  options: StaticOptions,
): Promise<SortedResult[]> {
  if (!query) return [];
  const { db, type } = await load(options.from ?? '/api/search', options.locale);

  if (type === 'simple') {
    return searchSimple(db, query);
  }

  return searchAdvanced(db, query, options.tag);
}
