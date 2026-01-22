import type { SortedResult } from '@/search';

export type ExportedData = {
  type: 'simple';
  data: SimpleIndex[];
};

export interface SimpleIndex {
  title: string;
  description?: string;
  breadcrumbs?: string[];
  content: string;
  url: string;
  keywords?: string;
}

export interface SearchServer {
  search: (query: string) => Promise<SortedResult[]>;
  export: () => Promise<ExportedData>;
}

export interface SearchAPI extends SearchServer {
  GET: (request: Request) => Promise<Response>;
  staticGET: () => Promise<Response>;
}

export function createSearchAPI(options: any): SearchAPI {
    return {
        GET: async () => new Response('Not implemented'),
        staticGET: async () => new Response('Not implemented'),
        search: async () => [],
        export: async () => ({ type: 'simple', data: [] })
    }
}

