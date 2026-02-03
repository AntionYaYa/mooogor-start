<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fly, slide } from "svelte/transition";
  import type {
    BookmarkNode,
    BookmarkSubType,
  } from "../entrypoints/newtab/methods/getBookmarks";
    import Button from "./components/Button.svelte";

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
    allBookmarksTree: BookmarkNode | undefined;
  }

  let { allBookmarksTree }: Props = $props();

  let searchItems: SearchItem[] = $state([]);
  let bookmarksresults: SearchItem[] = $state([]);

  let searchEl: HTMLInputElement | undefined = $state();
  let engineEls: HTMLDivElement | undefined = $state();
  let inputValue: string = $state("");

  $inspect(searchItems);

  onMount(async () => {
    document.addEventListener("click", handleDocumentClick);
  });

  function handleDocumentClick() {
    searchEl?.focus();
  }

  onDestroy(() => {
    window.removeEventListener("click", handleDocumentClick);
  });

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

  // function handleKeyDown(e: KeyboardEvent) {
  //   if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
  //   if (!searchEl || document.activeElement === searchEl) return;

  //   const key = e.key;

  //   if (/^[0-9a-zA-Z]$/.test(key)) {
  //     e.preventDefault();
  //     inputValue += key;
  //   } else if (key === "Backspace") {
  //     e.preventDefault();
  //     inputValue = inputValue.slice(0, -1);
  //   } else {
  //     return;
  //   }

  //   searchEl.focus();
  //   searchInput(inputValue);

  //   // if (key === "ArrowDown") {
  //   //   console.log(key);
  //   // }
  //   // if (key === "ArrowUp") {
  //   //   console.log(key);
  //   // }
  //   // if (key === "ArrowLeft") {
  //   //   console.log(key);
  //   // }
  //   // if (key === "ArrowRight") {
  //   //   console.log(key);
  //   // }
  // }

  function inputKey(e: KeyboardEvent) {
    const key = e.key;
    console.log(key)
    if (key === "Enter") {
      e.preventDefault();
      console.dir(engineEls);
      const first = engineEls?.children[0] as HTMLElement | undefined;
      first?.focus();
      first?.click();
    }

    if (key === 'ArrowDown') {
      if (bookmarksresults.length) {
        console.log(e)
      }
    }
    if (key === 'ArrowUp') {
      console.log(e)
    }
  }

  function clearInput() {
    inputValue=''
    searchInput(inputValue)
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
      class="input"
      bind:this={searchEl}
      bind:value={inputValue}
      type="text"
      placeholder="搜索 / 计算器 / 翻译"
      oninput={() => searchInput(inputValue)}
      onkeyup={inputKey}
      onfocus={() => {
        if (!searchItems.length) initBookmarks();
      }}
    />
    {#if inputValue.length}
      <Button text='x' onclick={clearInput}/>
    {/if}
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
    }

    .input_group:has(input:focus) {
      /* outline: 2px solid var(--c-text); */
      outline: none;
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
    max-height: calc(100vh - 110px);
    overflow-y: auto;
  }
</style>
