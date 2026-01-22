import type { Options as MiniSearchOptions, SearchOptions } from 'minisearch';
import { createEndpoint } from '@/search/minisearch/create-endpoint';
import {
  type AdvancedDocument,
  createDB,
  createDBSimple,
  type SimpleDocument,
} from '@/search/minisearch/create-db';
import { searchSimple } from '@/search/minisearch/search/simple';
import { searchAdvanced } from '@/search/minisearch/search/advanced';
import type { SortedResult } from '@/search';

type SearchType = 'simple' | 'advanced';

export type ExportedData =
  | { type: 'simple'; json: object }
  | { type: 'advanced'; json: object }
  | {
      type: 'i18n';
      data: Record<string, { type: SearchType; json: object }>;
    };

export interface SearchServer {
  search: (
    query: string,
    options?: {
      locale?: string;
      tag?: string | string[];
      mode?: 'vector' | 'full';
    },
  ) => Promise<SortedResult[]>;

  /**
   * Export the database
   *
   * You can reference the exported database to implement client-side search
   */
  export: () => Promise<ExportedData>;
}

export interface SearchAPI extends SearchServer {
  GET: (request: Request) => Promise<Response>;

  /**
   * `GET` route handler that exports search indexes for static search.
   */
  staticGET: () => Promise<Response>;
}

/**
 * Resolve indexes dynamically
 */
export type Dynamic<T> = () => T[] | Promise<T[]>;

type SharedOptions = Omit<MiniSearchOptions, 'fields' | 'storeFields'> & {
  tokenizer?: {
    tokenize: (text: string) => string[];
  };
  language?: string;
};

export interface SimpleOptions extends SharedOptions {
  indexes: Index[] | Dynamic<Index>;

  /**
   * Customise search options on server
   */
  search?: Partial<SearchOptions>;
}

export interface AdvancedOptions extends SharedOptions {
  indexes: AdvancedIndex[] | Dynamic<AdvancedIndex>;

  /**
   * Customise search options on server
   */
  search?: Partial<SearchOptions>;
}

export function createSearchAPI<T extends SearchType>(
  type: T,
  options: T extends 'simple' ? SimpleOptions : AdvancedOptions,
): SearchAPI {
  // if (type === 'simple') {
    // return createEndpoint(initSimpleSearch(options as SimpleOptions));
  // }

  return createEndpoint(initAdvancedSearch(options as AdvancedOptions));
}

export interface Index {
  title: string;
  description?: string;
  breadcrumbs?: string[];
  content: string;
  url: string;
  keywords?: string;
}

export function initSimpleSearch(options: SimpleOptions): SearchServer {
  const doc = createDBSimple(options);

  return {
    async export() {
      const db = await doc;
      return {
        type: 'simple',
        json: db.toJSON(),
      };
    },
    async search(query) {
      const db = await doc;

      return searchSimple(db, query, options.search);
    },
  };
}

export interface AdvancedIndex {
  id: string;
  title: string;
  description?: string;
  breadcrumbs?: string[];

  /**
   * Required if tag filter is enabled
   */
  tag?: string | string[];

  /**
   * preprocess mdx content with `structure`
   */
  structuredData: StructuredData;
  url: string;
}

// Re-defining StructuredData here or import? Original imported from remark-structure
import type { StructuredData } from '@/mdx-plugins/remark-structure';

export function initAdvancedSearch(options: AdvancedOptions): SearchServer {
  const get = createDB(options);

  return {
    async export() {
      const db = await get;
      return {
        type: 'advanced',
        json: db.toJSON(),
      };
    },
    async search(query, searchOptions) {
      const db = await get;
      const mode = searchOptions?.mode;

      return searchAdvanced(db, query, searchOptions?.tag, {
        ...options.search,
        mode: mode === 'vector' ? 'vector' : 'fulltext',
      }).catch((err) => {
        if (mode === 'vector') {
          throw new Error(
            'Vector search is not supported by Minisearch.',
            {
              cause: err,
            },
          );
        }

        throw err;
      });
    },
  };
}

export { createFromSource } from './minisearch/create-from-source';
export { createI18nSearchAPI } from './minisearch/create-i18n';
export * from './index';