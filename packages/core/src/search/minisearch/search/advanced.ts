import MiniSearch, { type SearchOptions } from 'minisearch';
import { type AdvancedDocument } from '@/search/minisearch/create-db';
import { createContentHighlighter, type SortedResult } from '@/search';

export async function searchAdvanced(
  db: MiniSearch<AdvancedDocument>,
  query: string,
  tag: string | string[] = [],
  options: SearchOptions & { mode?: 'vector' | 'fulltext' } = {},
): Promise<SortedResult[]> {
  const { mode = 'fulltext', ...override } = options;

  if (mode === 'vector') {
    throw new Error('Vector search is not supported by Minisearch');
  }

  if (typeof tag === 'string') tag = [tag];

  const filter = (doc: AdvancedDocument) => {
    if (tag.length > 0) {
        if (!doc.tags) return false;
        // Orama 'containsAll' logic
        const docTags = doc.tags;
        return (tag as string[]).every((t) => docTags.includes(t));
    }
    return true;
  };

  const params: SearchOptions = {
    tokenize: (string) => string.split(' '), // Simple tokenizer for query to ensure consistency if needed, though default is usually fine.
    fuzzy: 0.2,
    prefix: true,
    ...override,
    filter: (result) => {
        // Check custom filter from options first?
        // MiniSearch doesn't easily chain filters in options without wrapping.
        // But assuming `override.filter` doesn't exist or we can combine.
        const matchesTag = filter(result as unknown as AdvancedDocument);
        if (override.filter) {
            return matchesTag && override.filter(result);
        }
        return matchesTag;
    },
    // Orama has `properties` to limit search fields.
    // Minisearch has `fields`.
    fields: ['content'], // We only search content in advanced schema based on create-db
  };

  const highlighter = createContentHighlighter(query);
  const result = db.search(query, params);
  
  // Grouping
  const groups = new Map<string, any[]>();
  for (const hit of result) {
    if (!groups.has(hit.page_id)) {
        groups.set(hit.page_id, []);
    }
    groups.get(hit.page_id)?.push(hit);
  }

  const list: SortedResult[] = [];
  
  for (const [pageId, hits] of groups) {
    const page = db.getStoredFields(pageId);
    if (!page) continue;

    list.push({
      id: pageId,
      type: 'page',
      content: page.content as string,
      breadcrumbs: page.breadcrumbs as string[],
      contentWithHighlights: highlighter.highlight(page.content as string),
      url: page.url as string,
    });

    let count = 0;
    for (const hit of hits) {
      if (hit.type === 'page') continue;

      if (count >= 8) break;

      list.push({
        id: hit.id,
        content: hit.content as string,
        breadcrumbs: hit.breadcrumbs as string[],
        contentWithHighlights: highlighter.highlight(hit.content as string),
        type: hit.type as SortedResult['type'],
        url: hit.url as string,
      });
      count++;
    }
  }

  return list;
}
