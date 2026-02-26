<script lang="ts">
  import Baidu from "../assets/engines/Baidu.jpg";
  import Qihu360 from "../assets/engines/360.jpg";
  import Bing from "../assets/engines/Bing.jpg";
  import DuckDuckGo from "../assets/engines/DuckDuckGo.jpg";
  import Google from "../assets/engines/Google.jpg";
  import Naver from "../assets/engines/Naver.jpg";
  import Perplexity from "../assets/engines/Perplexity.jpg";
  import Sougou from "../assets/engines/Sougou.jpg";
  import Yahoo from "../assets/engines/Yahoo.jpg";
  import Yandex from "../assets/engines/Yandex.jpg";

  import { onMount } from "svelte";
  import { slide } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { dndzone } from "svelte-dnd-action";
  import type { DndEvent } from "svelte-dnd-action";
  import type { Engine } from "@/lib/DB/DB";
  import {
    ensureDefaultEngines,
    getEnabledEngines,
    getDisabledEngines,
    updateEnginesState,
  } from "@/lib/DB/DB";
  import defaultEnginesRaw from "@/lib/DB/defaultEngines.json";

  import type { BookmarkSubType } from "../entrypoints/newtab/methods/getBookmarks";
  import { searchBookmarks } from "../entrypoints/newtab/methods/getBookmarks";
  import type { HistoryItem } from "../entrypoints/newtab/methods/getHistorys";
  import Button from "./components/Button.svelte";
  import BkmkIcon from "./BkmkIcon.svelte";
  import Icon from "./components/Icon.svelte";
  import T from "./components/T.svelte";
  import G from "./components/G.svelte";
  import { t } from "@/lib/utils/i18n";

  type ItemType = BookmarkSubType | "engine" | "todo" | "history";

  interface Props {
    newTabOpen?: boolean;
  }

  let { newTabOpen = false }: Props = $props();

  interface SearchItem {
    id: string;
    type: ItemType;
    title: string;
    url?: string;
    folderPath?: string;
    iconUrl?: string;
  }

  const faviconMap: Record<string, string> = {
    Baidu,
    Qihu360,
    Bing,
    DuckDuckGo,
    Google,
    Naver,
    Perplexity,
    Sougou,
    Yahoo,
    Yandex,
  };

  type DefaultEngineRaw = {
    title?: string;
    engineUrl: string;
    faviconKey?: string;
    enabled?: boolean;
  };

  const defaultEngines: Omit<Engine, "id">[] = (
    defaultEnginesRaw as DefaultEngineRaw[]
  ).map((item) => ({
    title: item.title,
    engineUrl: item.engineUrl,
    faviconUrl: item.faviconKey ? faviconMap[item.faviconKey] : "",
    enabled: item.enabled,
  }));

  let enabledEngines: Engine[] = $state([]);
  let disabledEngines: Engine[] = $state([]);
  let bookmarksResults: SearchItem[] = $state([]);
  let historyResults: SearchItem[] = $state([]);
  let historyLoading = $state(false);

  let searchEl: HTMLInputElement | undefined = $state();
  let engineEls: HTMLDivElement | undefined = $state();
  let listEls: HTMLDivElement | undefined = $state();
  let inputValue: string = $state("");
  let showMoreEngines = $state(false);

  let searchSeq = $state(0);
  let historySeq = $state(0);
  let bookmarksDebounceId: ReturnType<typeof setTimeout> | null = null;
  let historyDebounceId: ReturnType<typeof setTimeout> | null = null;
  let bookmarksLoading = $state(false);
  let suppressNextEnter = $state(false);

  const HISTORY_MAX_RESULTS = 100;
  const SEARCH_DEBOUNCE_MS = 200;
  let isComposing = $state(false);

  // function handleDocumentClick(e: MouseEvent) {
  //   const target = e.target as HTMLElement | null;
  //   if (!target) return;
  //   if (
  //     target.closest(
  //       "input, textarea, select, [contenteditable='true'], [data-search-exempt]",
  //     )
  //   ) {
  //     return;
  //   }
  //   searchEl?.focus();
  // }

  onMount(async () => {
    // window.addEventListener("click", handleDocumentClick); //获取焦点
    await ensureDefaultEngines(defaultEngines); //初始化把数据添加到Engines表里，有就不会添加
    const enabled = await getEnabledEngines();
    enabledEngines = enabled.map((e) => ({ ...e, enabled: true }));
  });

  function handleConsiderEnabled(e: CustomEvent<DndEvent<Engine>>) {
    enabledEngines = e.detail.items.map((item) => ({
      ...item,
      enabled: true,
    }));
  }

  function handleConsiderDisabled(e: CustomEvent<DndEvent<Engine>>) {
    disabledEngines = e.detail.items.map((item) => ({
      ...item,
      enabled: false,
    }));
  }

  async function handleFinalizeEnabled(e: CustomEvent<DndEvent<Engine>>) {
    enabledEngines = e.detail.items.map((item) => ({
      ...item,
      enabled: true,
    }));
    const enabledWithIds = enabledEngines.filter(
      (i): i is Engine & { id: number } => !!i.id,
    );
    const disabledWithIds = disabledEngines.filter(
      (i): i is Engine & { id: number } => !!i.id,
    );
    if (enabledWithIds.length || disabledWithIds.length) {
      await updateEnginesState(enabledWithIds, disabledWithIds);
    }
  }

  async function handleFinalizeDisabled(e: CustomEvent<DndEvent<Engine>>) {
    disabledEngines = e.detail.items.map((item) => ({
      ...item,
      enabled: false,
    }));
    const enabledWithIds = enabledEngines.filter(
      (i): i is Engine & { id: number } => !!i.id,
    );
    const disabledWithIds = disabledEngines.filter(
      (i): i is Engine & { id: number } => !!i.id,
    );
    if (enabledWithIds.length || disabledWithIds.length) {
      await updateEnginesState(enabledWithIds, disabledWithIds);
    }
  }

  async function searchInput(value: string) {
    if (isComposing) return;
    if (!value) {
      searchSeq += 1;
      historySeq += 1;
      if (bookmarksDebounceId) {
        clearTimeout(bookmarksDebounceId);
        bookmarksDebounceId = null;
      }
      if (historyDebounceId) {
        clearTimeout(historyDebounceId);
        historyDebounceId = null;
      }
      bookmarksResults = [];
      historyResults = [];
      bookmarksLoading = false;
      historyLoading = false;
      listEls?.scrollTo({ top: 0 });
      return;
    }
    const seq = ++searchSeq;
    const hSeq = ++historySeq;
    historyResults = [];
    historyLoading = false;
    listEls?.scrollTo({ top: 0 });
    if (bookmarksDebounceId) clearTimeout(bookmarksDebounceId);
    bookmarksLoading = true;
    const bookmarkQuery = value;
    bookmarksDebounceId = setTimeout(async () => {
      if (seq !== searchSeq) return;
      try {
        const results = await searchBookmarks(bookmarkQuery, 200);
        if (seq !== searchSeq) return;
        bookmarksResults = sortResults(
          results
            .filter((item) => !!item.url)
            .map((item) => ({
              id: item.id,
              type: "other" as BookmarkSubType,
              title: getDisplayTitle(item.title, item.url),
              url: item.url,
            })),
          bookmarkQuery,
        );
      } catch {
        if (seq !== searchSeq) return;
        bookmarksResults = [];
      } finally {
        if (seq === searchSeq) bookmarksLoading = false;
      }
    }, SEARCH_DEBOUNCE_MS);
    if (historyDebounceId) clearTimeout(historyDebounceId);
    const query = value;
    historyDebounceId = setTimeout(async () => {
      if (hSeq !== historySeq) return;
      historyLoading = true;
      try {
        const results = await searchHistory(query);
        if (hSeq !== historySeq) return;
        historyResults = sortResults(mapHistoryResults(results), query);
      } catch {
        if (hSeq !== historySeq) return;
        historyResults = [];
      } finally {
        if (hSeq === historySeq) historyLoading = false;
      }
    }, SEARCH_DEBOUNCE_MS);
  }

  function inputKey(e: KeyboardEvent) {
    const key = e.key;
    if (isComposing || e.isComposing) return;
    if (suppressNextEnter && key === "Enter") {
      suppressNextEnter = false;
      return;
    }
    if (suppressNextEnter && key !== "Enter") {
      suppressNextEnter = false;
    }
    if (key === "ArrowUp") {
      return;
    }
    if (key === "ArrowDown") {
      if (!bookmarksResults.length && !historyResults.length) return;
      e.preventDefault();
      const [first] = getResultEls();
      if (first) {
        first.focus();
        first.scrollIntoView({ block: "nearest" });
      }
      return;
    }
    if (key === "Enter") {
      e.preventDefault();
      const active = document.activeElement as HTMLElement | null;
      if (active && listEls?.contains(active)) {
        (active as HTMLAnchorElement).click();
        return;
      }
      const first = engineEls?.children[0] as HTMLElement | undefined;
      first?.focus();
      first?.click();
    }
  }

  function handleResultKeydown(e: KeyboardEvent) {
    const items = getResultEls();
    const current = e.currentTarget as HTMLElement;
    const index = items.indexOf(current);
    if (index === -1) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = items[index + 1];
      if (next) {
        next.focus();
        next.scrollIntoView({ block: "nearest" });
      }
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = items[index - 1];
      if (prev) {
        prev.focus();
        prev.scrollIntoView({ block: "nearest" });
      } else {
        searchEl?.focus();
      }
    }
  }

  async function clickEditeEngines() {
    showMoreEngines = !showMoreEngines;
    if (!showMoreEngines) return;
    if (disabledEngines.length) return;
    const disabled = await getDisabledEngines();
    disabledEngines = disabled.map((e) => ({ ...e, enabled: false }));
  }

  function getResultEls() {
    if (!listEls) return [] as HTMLElement[];
    return Array.from(
      listEls.querySelectorAll<HTMLElement>("[data-result='true']"),
    );
  }

  async function searchHistory(query: string) {
    return await browser.history.search({
      text: query,
      startTime: 0,
      maxResults: HISTORY_MAX_RESULTS,
    });
  }

  function mapHistoryResults(items: HistoryItem[]): SearchItem[] {
    return items
      .filter((item) => !!item.url)
      .map((item) => ({
        id: String(item.id ?? item.url ?? item.lastVisitTime ?? ""),
        type: "history" as const,
        title: getDisplayTitle(item.title, item.url),
        url: item.url,
      }));
  }

  function getDisplayTitle(title?: string | null, url?: string | null) {
    const trimmed = title?.trim();
    if (trimmed) return trimmed;
    return url ?? t("nt_unnamed");
  }

  function sortResults(items: SearchItem[], query: string) {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    const score = (item: SearchItem) => {
      const title = item.title.toLowerCase();
      const url = item.url?.toLowerCase() ?? "";
      if (title.startsWith(needle)) return 3;
      if (title.includes(needle)) return 2;
      if (url.includes(needle)) return 1;
      return 0;
    };
    return [...items].sort((a, b) => score(b) - score(a));
  }
</script>

<div class="search_g">
  {@render temInputGroup()}
  {#if bookmarksResults.length || historyResults.length}
    <div
      class="list"
      bind:this={listEls}
      transition:slide={{ duration: 200 }}
    >
      {#if bookmarksResults.length}
      <G>
        <T type="s">{t("nt_label_bookmarks")}</T>
      </G>
        {#each bookmarksResults as bookmark}
          {@render temBkmk(bookmark)}
        {/each}
      {/if}

      {#if historyResults.length}
      <G>
        <T type="s">{t("nt_label_history")}</T>
      </G>
        {#each historyResults as history}
          {@render temBkmk(history)}
        {/each}
      {/if}

      {#if historyLoading || bookmarksLoading}
        <div class="more_trigger">
          <Icon name="Loading" color="var(--c-text)" />
        </div>
      {/if}
    </div>
  {/if}
</div>

{#snippet temInputGroup()}
  <div class="input_group">
    <input
      name="Search"
      class="input"
      bind:this={searchEl}
      bind:value={inputValue}
      type="search"
      placeholder={enabledEngines[0] ? enabledEngines[0].title : t("nt_search_placeholder")}
      oncompositionstart={() => (isComposing = true)}
      oncompositionend={(e) => {
        isComposing = false;
        suppressNextEnter = true;
        searchInput((e.currentTarget as HTMLInputElement).value);
      }}
      oninput={() => searchInput(inputValue)}
      onkeyup={inputKey}
    />
    {@render temEngines()}
  </div>
  {#if showMoreEngines}
    {@render temMoreEngines()}
  {/if}
{/snippet}

{#snippet temEngines()}
  <div class="engines_M">
    <div
      bind:this={engineEls}
      class="engines"
      class:drag={showMoreEngines}
      use:dndzone={{
        items: enabledEngines,
        flipDurationMs: 200,
        type: "engines",
        zoneTabIndex: -1,
        dropTargetStyle: {},
        dragDisabled: !showMoreEngines,
      }}
      onconsider={handleConsiderEnabled}
      onfinalize={handleFinalizeEnabled}
    >
      {#each enabledEngines as engine (engine.id)}
        <a
          class="engine"
          href={engine.engineUrl?.replace("%s", inputValue)}
          target={newTabOpen ? "_blank" : "_self"}
          rel={newTabOpen ? "noreferrer" : undefined}
          animate:flip={{ duration: 200 }}
        >
          <img
            class="engine_icon"
            src={engine.faviconUrl}
            alt={engine.title ?? ""}
          />
        </a>
      {/each}
    </div>
    <Button onclick={clickEditeEngines}>
      <Icon
        name={showMoreEngines ? "ChevronUp" : "ChevronDown"}
        color="var(--c-text)"
      />
    </Button>
  </div>
{/snippet}

{#snippet temMoreEngines()}
  <div class="more_engines_M" transition:slide={{ duration: 300 }}>
    <G full>
      <T>{t("nt_drag_sort_or_disable")}</T>
    </G>
    <div
      class="more_g"
      class:drag={showMoreEngines}
      use:dndzone={{
        items: disabledEngines,
        flipDurationMs: 200,
        type: "engines",
        zoneTabIndex: -1,
        dropTargetStyle: {},
        dragDisabled: !showMoreEngines,
      }}
      onconsider={handleConsiderDisabled}
      onfinalize={handleFinalizeDisabled}
    >
      {#each disabledEngines as engine (engine.id)}
        <button
          class="more_item"
          class:more_item_sel={engine.enabled}
          animate:flip={{ duration: 200 }}
        >
          <img
            class="engine_icon"
            src={engine.faviconUrl}
            alt={engine.title ?? ""}
          />
        </button>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet temBkmk(bookmark: SearchItem)}
  <a
    class="item"
    href={bookmark.url}
    target={newTabOpen ? "_blank" : "_self"}
    rel={newTabOpen ? "noreferrer" : undefined}
    onkeydown={handleResultKeydown}
    data-result="true"
  >
    <G>
      <BkmkIcon imgUrl={bookmark.url} alt={bookmark.title} size="s" />
    </G>
    <G vertical full>
      <T type="m" bold nowrap>{bookmark.title}</T>
    </G>
  </a>
{/snippet}

<style>
  .engines_M {
    display: flex;
    align-items: center;
    flex-direction: row;
  }
  .more_engines_M {
    display: flex;
    align-items: center;
    flex-direction: row;
    padding: var(--gap) 42px var(--gap) var(--gap);
    width: 100%;
    box-sizing: border-box;
  }

  .more_item {
    display: flex;
    background-color: unset;
    border: none;
    padding: 0;
    border-radius: var(--r);
    filter: grayscale();
  }
  .more_item_sel {
    filter: grayscale(0);
  }
  .search_g {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    /* padding: var(--gap); */
    background-color: var(--c-bg);
    border-radius: calc(var(--r1) + var(--gap));
    width: 100%;
    min-width: 200px;
    max-width: 600px;
    box-sizing: border-box;
  }
  .list {
    display: flex;
    gap: var(--gap);
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
    max-height: calc(100vh - 110px);
    overflow-y: auto;
  }
  .more_trigger {
    display: flex;
    justify-content: center;
    padding: var(--gap) 0;
  }

  .input_group {
    display: flex;
    flex-direction: row;
    align-items: center;
    border-radius: calc(var(--r) + var(--gap));
    padding: var(--gap);
    width: 100%;
    box-sizing: border-box;
  }

  .input_group:has(input:focus) {
    outline: 2px solid var(--c-text);
    /* outline: none; */
  }
  .input {
    color: var(--c-text);
    font-size: var(--f-size-m);
    background-color: unset;
    border: none;
    padding: var(--gap);
    width: 100%;
    height: 40px;
    caret-color:var(--c-green);
  }
  .input::selection{
      background-color: var(--c-green);
      color: var(--c-bg);
    }
  .input::placeholder {
    color: var(--c-text-2);
  }
  .input:focus {
    outline: none;
  }

  .more_g,
  .engines {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: var(--gap);
    padding: var(--gap);
    border-radius: var(--r);
    min-height: 30px;
  }
  .drag {
    outline: 2px var(--c-text-2) dashed;
    min-width: 335px;
  }
  .engine {
    display: flex;
    border-radius: var(--r);
    overflow: hidden;
    cursor: default !important;
  }
  .engine:focus-visible {
    outline: 2px var(--c-text) solid;
  }
  .engine_icon {
    width: 26px;
    height: 26px;
    border-radius: var(--r);
    padding: 2px;
    pointer-events: none;
  }

  .item {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
    text-decoration: none;
    gap: var(--gap);
    padding: var(--gap);
    border-radius: var(--r);
    cursor: default;
  }
  .engine:active,
  .item:active {
    background-color: var(--c-mask);
    transition: all 0.1s ease-out;
  }
  .engine:focus,
  .item:focus {
    outline: 2px var(--c-text) solid;
  }
</style>
