import MiniSearch, { type SearchOptions } from 'minisearch';
import { type SimpleDocument } from '@/search/minisearch/create-db';
import { createContentHighlighter, type SortedResult } from '@/search';

export async function searchSimple(
  db: MiniSearch<SimpleDocument>,
  query: string,
  params: SearchOptions = {},
): Promise<SortedResult[]> {
  const highlighter = createContentHighlighter(query);
  const result = db.search(query, {
    fuzzy: 0.2,
    prefix: true,
    ...params,
    boost: {
      title: 4,
      description: 2,
      keywords: 2,
      ...params.boost,
    },
  });

  return result.map((hit) => ({
    type: 'page',
    content: hit.title,
    breadcrumbs: hit.breadcrumbs,
    contentWithHighlights: highlighter.highlight(hit.title),
    id: hit.url,
    url: hit.url,
  }));
}
