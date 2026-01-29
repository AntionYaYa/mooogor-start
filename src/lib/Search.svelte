<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fly, slide } from "svelte/transition";
  type BookmarkNode = Browser.bookmarks.BookmarkTreeNode;

  type BookmarkSubType = "bookmarks-bar" | "other";
  type ItemType = BookmarkSubType | "engine" | "todo";

  interface SearchItem {
    id: string;
    type: ItemType;
    title: string;
    url?: string;
    folderPath?: string;
    iconUrl?: string;
  }

  const iconUrlDomain = "https://www.google.com/s2/favicons?sz=32&domain_url=";
  const engines: SearchItem[] = [
    {
      id: "baidu",
      type: "engine",
      title: "Baidu",
      url: "https://www.baidu.com/s?wd=%s",
      iconUrl: iconUrlDomain + "https://www.baidu.com",
    },
    {
      id: "bing",
      type: "engine",
      title: "bing",
      url: "https://www.bing.com/search?q=%s",
      iconUrl: iconUrlDomain + "https://www.bing.com",
    },
    {
      id: "google",
      type: "engine",
      title: "Google",
      url: "https://www.google.com/search?q=%s",
      iconUrl: iconUrlDomain + "https://www.google.com",
    },
  ];

  interface Props {
    allBookmarksTree: BookmarkNode[] | [];
  }

  let { allBookmarksTree }: Props = $props();

  let searchItems: SearchItem[] = $state([]);
  let bookmarksresults: SearchItem[] = $state([]);

  let searchEl: HTMLInputElement | undefined = $state();
  let engineEls: HTMLDivElement | undefined = $state();
  let inputValue: string = $state("");

  $inspect(searchItems);

  onMount(async () => {
    window.addEventListener("keydown", handleKeyDown);
  });

  onDestroy(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });

  function initBookmarks() {
    const allBookmarksBar = getBookmarks("bookmarks-bar");
    const allBookmarksOther = getBookmarks("other");
    searchItems.push(
      ...flattenBookmarksToSearchItems(allBookmarksBar, "bookmarks-bar"),
    ); 
    searchItems.push(
      ...flattenBookmarksToSearchItems(allBookmarksOther, "other"),
    );
    // bookmarksresults = searchItems;
  }

  function getBookmarks(subType: BookmarkSubType): BookmarkNode[] {
    if (!allBookmarksTree) return [];
    const topLevel = allBookmarksTree[0]?.children ?? [];
    const folder = topLevel.find((item) => item.folderType === subType);
    return folder?.children ?? [];
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
          type,
          title: node.title,
          url: node.url,
          folderPath: path,
        });
      } else if (node.children) {
        const newPath = path ? `${path}/${node.title}` : node.title;
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

    // 可选：按最近访问或类型排序
    // results.sort((a, b) => {
    //   if (a.type !== b.type) return a.type.localeCompare(b.type);
    //   return (b.lastVisited ?? 0) - (a.lastVisited ?? 0);
    // });

    return results;
  }

  function handleKeyDown(e: KeyboardEvent) {
    const key = e.key;
    // 匹配 0-9、A-Z、a-z
    if (/^[0-9a-zA-Z]$/.test(key)) {
      if (!searchEl || document.activeElement === searchEl) return;
      e.preventDefault();
      inputValue = inputValue + key;
      searchEl?.focus();
      searchInput(inputValue);
    }
    if (key === "Backspace") {
      if (!searchEl || document.activeElement === searchEl) return;
      e.preventDefault();
      inputValue = inputValue.slice(0, -1);
      searchEl?.focus();
      searchInput(inputValue);
    }

    if (key === "ArrowDown") {
      console.log(key);
    }
    if (key === "ArrowUp") {
      console.log(key);
    }
    if (key === "ArrowLeft") {
      console.log(key);
    }
    if (key === "ArrowRight") {
      console.log(key);
    }
  }
  function inputKey(e: KeyboardEvent) {
    const key = e.key;
    if (key === "Enter") {
      e.preventDefault();
      console.dir(engineEls);
      const first = engineEls?.children[0] as HTMLElement | undefined;
      first?.focus();
      first?.click();
    }
  }
</script>

<div class="search_g">
  {@render temInputGroup()}
  {#if bookmarksresults.length > 0}
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
      class="input"
      bind:this={searchEl}
      bind:value={inputValue}
      type="text"
      placeholder="搜索 / 计算器 / 翻译"
      oninput={() => searchInput(inputValue)}
      onkeyup={inputKey}
      onfocus={()=>initBookmarks()}
      onblur={()=>searchItems = []}
    />
    <div bind:this={engineEls} class="engines">
      {#each engines as engine}
        <a class="engine" href={engine.url?.replace("%s", inputValue)}>
          <img class="engine_icon" src={engine.iconUrl} alt="" />
        </a>
      {/each}
    </div>
  </div>
  <style>
    .input_group {
      display: flex;
      flex-direction: row;
      align-items: center;
      border-radius: var(--r);
      background-color: var(--c-bg1);
      padding: var(--gap);
      gap: var(--gap);
      width: 100%;
      box-sizing: border-box;
      z-index: 1;
    }

    .input_group:has(input:focus) {
      outline: 2px solid var(--c-text);
    }
    .input {
      color: var(--c-text);
      font-size: var(--f-size-m);
      background-color: unset;
      /* background-color: antiquewhite; */
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
      gap: var(--gap);
      flex-direction: row;
      align-items: center;
    }
    .engine {
      display: flex;
      border-radius: calc(var(--r) / 2);
    }
    .engine:focus {
      outline: 2px var(--c-text) solid;
    }
    .engine_icon {
      width: 20px;
      height: 20px;
      border-radius: calc(var(--r) / 2);
      padding: calc(var(--gap) / 2);
    }
  </style>
{/snippet}

{#snippet temBkmk(bookmark: SearchItem)}
  <a
    class="item {bookmark.type === 'other' ? 'other' : ''}"
    href={bookmark.url}
  >
    <img class="icon" src={iconUrlDomain + bookmark.url} alt={bookmark.title} />
    <p class="text">
      {bookmark.title}
    </p>
  </a>
  <style>
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
      border-radius: var(--r);
    }
    .item:focus {
      outline: 2px var(--c-text) solid;
    }
    .icon {
      width: 20px;
      height: 20px;
      display: flex;
      padding: var(--gap);
    }
    .other {
      color: aqua;
    }
  </style>
{/snippet}

<style>
  .search_g {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--gap);
    background-color: var(--c-bg1);
    border-radius: calc(var(--r) + var(--gap));
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
    max-height: calc(100vh - 100px);
    overflow-y: auto;
  }
</style>
