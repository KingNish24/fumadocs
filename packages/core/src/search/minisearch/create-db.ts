import MiniSearch, { type Options as MiniSearchOptions } from 'minisearch';
import { type AdvancedOptions, type SimpleOptions } from '@/search/server';

export interface SimpleDocument {
  id: string;
  title: string;
  url: string;
  breadcrumbs: string[];
  description?: string;
  content: string;
  keywords?: string;
}

export interface AdvancedDocument {
  id: string;
  page_id: string;
  type: 'page' | 'heading' | 'text';
  content: string;
  breadcrumbs: string[];
  tags?: string[];
  url: string;
}

export const advancedOptions: MiniSearchOptions = {
  fields: ['content'],
  storeFields: ['id', 'page_id', 'type', 'content', 'breadcrumbs', 'tags', 'url'],
  extractField: (doc: unknown, fieldName: string) => {
    if (typeof doc === 'object' && doc !== null && fieldName === 'tags') {
      const tags = (doc as Record<string, unknown>)[fieldName];
      if (Array.isArray(tags)) {
        return tags.join(' ');
      }
    }
    return MiniSearch.getDefault('extractField')(doc, fieldName);
  },
};

export async function createDB({
  indexes,
  tokenizer,
  search: _,
  ...rest
}: AdvancedOptions): Promise<MiniSearch<AdvancedDocument>> {
  const items = typeof indexes === 'function' ? await indexes() : indexes;

  const db = new MiniSearch<AdvancedDocument>({
    ...advancedOptions,
    ...rest,
    ...(tokenizer ? { tokenize: (text) => tokenizer.tokenize(text) } : {}),
  });

  const mapTo: AdvancedDocument[] = [];
  items.forEach((page) => {
    const pageTag = page.tag ?? [];
    const tags = Array.isArray(pageTag) ? pageTag : [pageTag];
    const data = page.structuredData;
    let id = 0;

    mapTo.push({
      id: page.id,
      page_id: page.id,
      type: 'page',
      content: page.title,
      breadcrumbs: page.breadcrumbs ?? [],
      tags,
      url: page.url,
    });

    const nextId = () => `${page.id}-${id++}`;

    if (page.description) {
      mapTo.push({
        id: nextId(),
        page_id: page.id,
        tags,
        type: 'text',
        url: page.url,
        content: page.description,
        breadcrumbs: page.breadcrumbs ?? [],
      });
    }

    for (const heading of data.headings) {
      mapTo.push({
        id: nextId(),
        page_id: page.id,
        type: 'heading',
        tags,
        url: `${page.url}#${heading.id}`,
        content: heading.content,
        breadcrumbs: page.breadcrumbs ?? [],
      });
    }

    for (const content of data.contents) {
      mapTo.push({
        id: nextId(),
        page_id: page.id,
        tags,
        type: 'text',
        url: content.heading ? `${page.url}#${content.heading}` : page.url,
        content: content.content,
        breadcrumbs: page.breadcrumbs ?? [],
      });
    }
  });

  db.addAll(mapTo);
  return db;
}

export const simpleOptions: MiniSearchOptions = {
  fields: ['title', 'description', 'content', 'keywords'],
  storeFields: ['id', 'title', 'description', 'content', 'breadcrumbs', 'url', 'keywords'],
};

export async function createDBSimple({
  indexes,
  tokenizer,
  ...rest
}: SimpleOptions): Promise<MiniSearch<SimpleDocument>> {
  const items = typeof indexes === 'function' ? await indexes() : indexes;
  const db = new MiniSearch<SimpleDocument>({
    ...simpleOptions,
    ...rest,
    ...(tokenizer ? { tokenize: (text) => tokenizer.tokenize(text) } : {}),
  });

  db.addAll(
    items.map((page) => ({
      id: page.url,
      title: page.title,
      description: page.description,
      breadcrumbs: page.breadcrumbs ?? [],
      url: page.url,
      content: page.content,
      keywords: page.keywords,
    })),
  );

  return db;
}
