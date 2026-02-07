<script lang="ts">
  import Baidu from "../assets/Baidu.jpg";
  import Qihu360 from "../assets/360.jpg";
  import Bing from "../assets/Bing.jpg";
  import DuckDuckGo from "../assets/DuckDuckGo.jpg";
  import Google from "../assets/Google.jpg";
  import Naver from "../assets/Naver.jpg";
  import Perplexity from "../assets/Perplexity.jpg";
  import Sougou from "../assets/Sougou.jpg";
  import Yahoo from "../assets/Yahoo.jpg";
  import Yandex from "../assets/Yandex.jpg";

  import { onMount, onDestroy } from "svelte";
  import { slide } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { dndzone } from "svelte-dnd-action";
  import type { DndEvent } from "svelte-dnd-action";
  import type { Engine } from "@/lib/DB/DB";
  import {
    ensureDefaultEngines,
    getAllEnableEngine,
    updateEnginesOrder,
  } from "@/lib/DB/DB";
  import defaultEnginesRaw from "@/lib/DB/defaultEngines.json";

  import type {
    BookmarkNode,
    BookmarkSubType,
  } from "../entrypoints/newtab/methods/getBookmarks";
  import Button from "./components/Button.svelte";
  import BkmkIcon from "./BkmkIcon.svelte";

  type ItemType = BookmarkSubType | "engine" | "todo";

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

  interface Props {
    allBookmarksTree: BookmarkNode | undefined;
  }

  let { allBookmarksTree }: Props = $props();

  let engines: Engine[] = $state([]);
  let isDragging = $state(false);
  let searchItems: SearchItem[] = $state([]);
  let bookmarksresults: SearchItem[] = $state([]);

  let searchEl: HTMLInputElement | undefined = $state();
  let engineEls: HTMLDivElement | undefined = $state();
  let inputValue: string = $state("");
  let showMoreEngines = $state(false);

  $inspect(searchItems);

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
    await ensureDefaultEngines(defaultEngines); //初始化把数据添加到Engines表里
    engines = await getAllEnableEngine();
  });

  // onDestroy(() => {
  //   window.removeEventListener("click", handleDocumentClick);
  // });

  function handleConsider(e: CustomEvent<DndEvent<Engine>>) {
    isDragging = true;
    engines = e.detail.items;
  }

  async function handleFinalize(e: CustomEvent<DndEvent<Engine>>) {
    isDragging = false;
    engines = e.detail.items;
    const withIds = engines.filter((i): i is Engine & { id: number } => !!i.id);
    if (withIds.length > 0) {
      await updateEnginesOrder(withIds);
    }
  }

  function initBookmarks() {
    searchItems = [];
    if (!allBookmarksTree?.children) return;

    const rootChildren = allBookmarksTree.children;

    for (const root of rootChildren) {
      if (root.children && root.folderType) {
        searchItems.push(
          ...flattenBookmarksToSearchItems(root.children, root.folderType),
        );
      }
    }
  }

  async function getSearchKey() {
    browser.history.search({ text: "", maxResults: 1000 }, (items) => {
      console.log(items); // 包含 title, url, lastVisitTime
    });
  }

  function flattenBookmarksToSearchItems(
    nodes: BookmarkNode[],
    type: BookmarkSubType,
    path = "",
  ): SearchItem[] {
    let result: SearchItem[] = [];

    for (const node of nodes) {
      if (node.url) {
        result.push({
          id: node.id,
          type, // 继承上级 type
          title: node.title,
          url: node.url,
          folderPath: path,
        });
      } else if (node.children) {
        const newPath = path ? `${path}/${node.title}` : node.title;
        // 递归时 type 不变
        result = result.concat(
          flattenBookmarksToSearchItems(node.children, type, newPath),
        );
      }
    }

    return result;
  }

  function searchInput(value: string) {
    bookmarksresults = onsearch(value);
  }

  function onsearch(query: string): SearchItem[] {
    if (!query) return [];

    // 简单大小写不敏感匹配
    const lowerQuery = query.toLowerCase();

    const results = searchItems.filter((item) => {
      // 匹配标题或路径
      const titleMatch = item.title.toLowerCase().includes(lowerQuery);
      const pathMatch =
        item.folderPath?.toLowerCase().includes(lowerQuery) ?? false;
      return titleMatch || pathMatch;
    });
    return results;
  }

  function inputKey(e: KeyboardEvent) {
    const key = e.key;
    console.log(key);
    if (key === "Enter") {
      e.preventDefault();
      const first = engineEls?.children[0] as HTMLElement | undefined;
      first?.focus();
      first?.click();
    }

    if (key === "ArrowDown") {
      if (bookmarksresults.length) {
        console.log(e);
      }
    }
    if (key === "ArrowUp") {
      console.log(e);
    }
  }
</script>

<div class="search_g">
  {@render temInputGroup()}
  {#if bookmarksresults.length}
    <div class="list" transition:slide={{ duration: 200 }}>
      {#each bookmarksresults as bookmark}
        {@render temBkmk(bookmark)}
      {/each}
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
      placeholder="搜索 / 计算器 / 翻译"
      oninput={() => searchInput(inputValue)}
      onkeyup={inputKey}
      onfocus={() => {
        if (!searchItems.length) initBookmarks();
      }}
    />
    {@render temEngines()}
    <Button
      iconName={showMoreEngines ? "ChevronUp" : "ChevronDown"}
      onclick={() => (showMoreEngines = !showMoreEngines)}
      mini
    />
  </div>
  {#if showMoreEngines}
    {@render temMoreEngines()}
  {/if}
{/snippet}

{#snippet temEngines()}
  <div
    bind:this={engineEls}
    class="engines {isDragging ? 'drag' : ''}"
    use:dndzone={{
      items: engines,
      flipDurationMs: 200,
      type: "engines",
      zoneTabIndex: -1,
      dropTargetStyle: {},
    }}
    onconsider={handleConsider}
    onfinalize={handleFinalize}
  >
    {#each engines as engine (engine.id)}
      <a
        class="engine"
        href={engine.engineUrl?.replace("%s", inputValue)}
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
{/snippet}

{#snippet temMoreEngines()}
  <div class="more_g">
    {#each engines as engine (engine.id)}
      <button class="more_item" class:more_item_sel={engine.enabled}>
        <img
          class="engine_icon"
          src={engine.faviconUrl}
          alt={engine.title ?? ""}
        />
      </button>
    {/each}
  </div>
{/snippet}

{#snippet temBkmk(bookmark: SearchItem)}
  <a
    class="item {bookmark.type === 'other' ? 'other' : ''}"
    href={bookmark.url}
  >
    <BkmkIcon imgUrl={bookmark.url} alt={bookmark.title} size="s" />
    <p class="text">
      {bookmark.title}
    </p>
  </a>
{/snippet}

<style>
  .more_g{
    display: flex;
  }
  .more_item{
    display: flex;
    background-color: unset;
    border: none;
    padding: var(--gap);
    border-radius: var(--r);
    filter: grayscale();
  }
  .more_item_sel{
    background-color: aqua;
    filter: grayscale(0);
  }
  .search_g {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    padding: var(--gap);
    background-color: var(--c-bg1);
    border-radius: calc(var(--r1) + var(--gap));
    width: 100%;
    min-width: 200px;
    max-width: 600px;
    box-sizing: border-box;
    gap: var(--gap);
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
  }
  .input::placeholder {
    color: var(--c-text-2);
  }
  .input:focus {
    outline: none;
  }
  .engines {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--gap);
    padding: var(--gap);
    border-radius: var(--r);
  }
  .engines.drag {
    outline: 2px var(--c-text-2) dashed;
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

  .text {
    color: var(--c-text);
    padding: var(--gap);
    width: 100%;
    margin: 0;
    font-size: var(--f-size-s);
    display: flex;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
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
  }
  .item:focus {
    outline: 2px var(--c-text) solid;
  }
  .other {
    color: aqua;
  }
</style>
