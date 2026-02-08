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

  import type {
    BookmarkNode,
    BookmarkSubType,
  } from "../entrypoints/newtab/methods/getBookmarks";
  import { searchBookmarks } from "../entrypoints/newtab/methods/getBookmarks";
  import Button from "./components/Button.svelte";
  import BkmkIcon from "./BkmkIcon.svelte";
    import T from "./components/T.svelte";
    import G from "./components/G.svelte";

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

  let enabledEngines: Engine[] = $state([]);
  let disabledEngines: Engine[] = $state([]);
  let isDragging = $state(false);
  let bookmarksresults: SearchItem[] = $state([]);

  let searchEl: HTMLInputElement | undefined = $state();
  let engineEls: HTMLDivElement | undefined = $state();
  let listEls: HTMLDivElement | undefined = $state();
  let inputValue: string = $state("");
  let showMoreEngines = $state(false);

  let searchSeq = $state(0);

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
    isDragging = true;
    enabledEngines = e.detail.items.map((item) => ({
      ...item,
      enabled: true,
    }));
  }

  function handleConsiderDisabled(e: CustomEvent<DndEvent<Engine>>) {
    isDragging = true;
    disabledEngines = e.detail.items.map((item) => ({
      ...item,
      enabled: false,
    }));
  }

  async function handleFinalizeEnabled(e: CustomEvent<DndEvent<Engine>>) {
    isDragging = false;
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
    isDragging = false;
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
    if (!value) {
      bookmarksresults = [];
      return;
    }
    const seq = ++searchSeq;
    try {
      const results = await searchBookmarks(value, 200);
      if (seq !== searchSeq) return;
      bookmarksresults = results
        .filter((item) => !!item.url)
        .map((item) => ({
          id: item.id,
          type: "other" as BookmarkSubType,
          title: item.title,
          url: item.url,
        }));
    } catch {
      if (seq !== searchSeq) return;
      bookmarksresults = [];
    }
  }

  function inputKey(e: KeyboardEvent) {
    const key = e.key;
    if (key === "ArrowUp") {
      return;
    }
    if (key === "ArrowDown") {
      if (!bookmarksresults.length) return;
      e.preventDefault();
      const first = listEls?.firstElementChild as HTMLElement | null;
      first?.focus();
      first?.scrollIntoView({ block: "nearest" });
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
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = (e.currentTarget as HTMLElement)
        .nextElementSibling as HTMLElement | null;
      next?.focus();
      next?.scrollIntoView({ block: "nearest" });
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (e.currentTarget as HTMLElement)
        .previousElementSibling as HTMLElement | null;
      if (prev) {
        prev.focus();
        prev.scrollIntoView({ block: "nearest" });
      } else {
        searchEl?.focus();
      }
    }
  }

  async function clickEditeEngines() {
    showMoreEngines = !showMoreEngines
    if (!showMoreEngines) return
    if (disabledEngines.length) return;
    const disabled = await getDisabledEngines();
    disabledEngines = disabled.map((e) => ({ ...e, enabled: false }));
  }

</script>

<div class="search_g">
  {@render temInputGroup()}
  {#if bookmarksresults.length}
    <div class="list" bind:this={listEls} transition:slide={{ duration: 200 }}>
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
      placeholder={enabledEngines[0] ? enabledEngines[0].title : "搜索"}
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
      class:drag={isDragging}
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
    <Button
      iconName={showMoreEngines ? "ChevronUp" : "ChevronDown"}
      onclick={clickEditeEngines}
      mini
    />
  </div>
{/snippet}

{#snippet temMoreEngines()}
  <div class="more_engines_M" transition:slide={{ duration: 300 }}>
    <G full>
      <T>拖拽排序或禁用</T>
    </G>
    <div
      class="more_g"
      class:drag={isDragging}
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
    class="item {bookmark.type === 'other' ? 'other' : ''}"
    href={bookmark.url}
    onkeydown={handleResultKeydown}
  >
  <G> 
    <BkmkIcon imgUrl={bookmark.url} alt={bookmark.title} size="s" />
  </G>
    <G vertical> 
      <T type='m' bold> {bookmark.title}</T>
      <T type='s'> {bookmark.url}</T>
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
    height: 40px;
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
  }
  .item:focus {
    outline: 2px var(--c-text) solid;
  }
  .other {
    color: aqua;
  }
</style>
