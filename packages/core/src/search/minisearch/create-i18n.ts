import {
  type AdvancedIndex,
  type AdvancedOptions,
  type Dynamic,
  type Index,
  initAdvancedSearch,
  initSimpleSearch,
  type SearchAPI,
  type SearchServer,
  type SimpleOptions,
} from '@/search/server';
import { createEndpoint } from '@/search/minisearch/create-endpoint';
import { type I18nConfig } from '@/i18n';

type I18nOptions<O extends SimpleOptions | AdvancedOptions, Idx> = Omit<
  O,
  'language' | 'indexes'
> & {
  i18n: I18nConfig;
  localeMap?: Record<string, Partial<O> | undefined>;

  indexes: WithLocale<Idx>[] | Dynamic<WithLocale<Idx>>;
};

type I18nSimpleOptions = I18nOptions<SimpleOptions, Index>;
type I18nAdvancedOptions = I18nOptions<AdvancedOptions, AdvancedIndex>;

type WithLocale<T> = T & {
  locale: string;
};

async function initSimple(options: I18nSimpleOptions): Promise<Map<string, SearchServer>> {
  const map = new Map<string, SearchServer>();
  if (options.i18n.languages.length === 0) {
    return map;
  }

  const indexes = typeof options.indexes === 'function' ? await options.indexes() : options.indexes;

  for (const locale of options.i18n.languages) {
    const localeIndexes = indexes.filter((index) => index.locale === locale);
    const mapped = options.localeMap?.[locale];

    map.set(
      locale,
      initSimpleSearch({
        ...options,
        ...mapped,
        indexes: localeIndexes,
      }),
    );
  }

  return map;
}

async function initAdvanced(options: I18nAdvancedOptions): Promise<Map<string, SearchServer>> {
  const map = new Map<string, SearchServer>();
  if (options.i18n.languages.length === 0) {
    return map;
  }

  const indexes = typeof options.indexes === 'function' ? await options.indexes() : options.indexes;

  for (const locale of options.i18n.languages) {
    const localeIndexes = indexes.filter((index) => index.locale === locale);
    const mapped = options.localeMap?.[locale];

    map.set(
      locale,
      initAdvancedSearch({
        ...options,
        ...mapped,
        indexes: localeIndexes,
      }),
    );
  }

  return map;
}

export function createI18nSearchAPI<T extends 'simple' | 'advanced'>(
  type: T,
  options: T extends 'simple' ? I18nSimpleOptions : I18nAdvancedOptions,
): SearchAPI {
  const get =
    type === 'simple'
      ? initSimple(options as I18nSimpleOptions)
      : initAdvanced(options as I18nAdvancedOptions);
  return createEndpoint({
    async export() {
      const map = await get;
      const entries = Array.from(map.entries()).map(async ([k, v]) => [
        k,
        await (v as SearchServer).export(),
      ]);

      return {
        type: 'i18n',
        data: Object.fromEntries(await Promise.all(entries)),
      };
    },
    async search(query, searchOptions) {
      const map = await get;

      const locale = searchOptions?.locale ?? options.i18n.defaultLanguage;
      const handler = map.get(locale);

      if (handler) return handler.search(query, searchOptions);
      return [];
    },
  });
}
