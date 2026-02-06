<script lang="ts">
  import Search from "@/lib/Search.svelte";
  import Settings from "@/lib/Settings.svelte";
  import Button from "@/lib/components/Button.svelte";
  import G from "@/lib/components/G.svelte";
  import T from "@/lib/components/T.svelte";
  import Tab from "@/lib/components/Tab.svelte";
  import type { TabItem } from "@/lib/components/Tab.svelte";
  import Bookmarks from "@/lib/Bookmarks.svelte";
  import History from "@/lib/History.svelte";
  import Pinneds from "@/lib/Pinneds.svelte";
  import { hasPermission, requestPermission } from "./methods/getPermission";
  import type { Permission } from "./methods/getPermission";
  import { getBookmarks } from "./methods/getBookmarks";
  import type { BookmarkNode, BookmarkSubType } from "./methods/getBookmarks";
  import { getHistorys } from "./methods/getHistorys";
  import  { getAllWebSite } from "@/lib/DB/DB";
  import type { WebSite } from "@/lib/DB/DB";
  import { fly } from "svelte/transition";
  import { onMount, tick } from "svelte";

  let showSetting = $state(false);
  let allPinneds: WebSite[] = $state([]);

  let bookmarksPermission = $state(false);
  let allBookmarksTree: BookmarkNode | undefined = $state();

  let historyPermission = $state(false);
  let AllHistory: BookmarkNode[] = $state([]);

  let tabs: TabItem[] = $state([
    { key: "0", name: "常用", sel: false },
    { key: "1", name: "书签", sel: false },
    { key: "2", name: "历史记录", sel: false },
  ]);

  let selTab: TabItem | undefined = $state();
  let showNext = $state(false);
  let firstMount = $state(true);

  let currentNode: BookmarkNode | undefined = $state();
  let historyStack: BookmarkNode[] = $state([]);

  init();

  async function init() {
    initPinneds();
    bookmarksPermission = await hasPermission("bookmarks");
    if (bookmarksPermission) {
      await initBookmarks();
    }
    historyPermission = await hasPermission("history");
    if (historyPermission) {
      const allHistoryTree = await getHistorys();
      console.log(allHistoryTree);
    }
  }
  

  async function initPinneds() {
    allPinneds = await getAllWebSite()

  }
  async function initBookmarks() {
    const allBookmarks = await getBookmarks();
    allBookmarksTree = allBookmarks[0];
    if (!allBookmarksTree.children) return;
  }
  $inspect(allBookmarksTree)

  async function clickGetPermission(permission: Permission) {
    if (permission === "bookmarks") {
      bookmarksPermission = await requestPermission(permission);
      if (bookmarksPermission) {
        await initBookmarks();
        if (!currentNode) {
          initBookmarkView();
        }
      }
    }
    if (permission === "history") {
      historyPermission = await requestPermission(permission);
    }
  }

  onMount(async () => {
    clickTab(tabs[0], 0);
    await tick();
    firstMount = false;
  });

  function clickTab(tab: TabItem, i: number) {
    if (tab.key === "0") {
      initPinneds();
    }
    if (tab.key === "1") {
      if (tab.sel && historyStack.length === 2) {
        tabs[1].name = "书签";
        goBack();
      }
    }

    if (tab.sel) return;
    updateShowNext(i);
    updateSelTab(tab);

    if (currentNode) return;
    initBookmarkView();
  }

  function updateSelTab(tab: TabItem) {
    tabs.forEach((item) => {
      item.sel = item.key === tab.key;
    });
    selTab = tab;
  }

  function updateShowNext(i: number) {
    if (selTab) {
      const selTabIndex = tabs.findIndex((item) => item.key === selTab!.key);
      showNext = selTabIndex < i;
    }
  }

  async function initBookmarkView() {
    if (!allBookmarksTree) return;
    clickFolder(allBookmarksTree);
    if (!allBookmarksTree.children) return;
    clickFolder(allBookmarksTree.children[0]);
  }

  function clickFolder(bkmk: BookmarkNode) {
    if (bkmk.folderType) {
      tabs[1].name = bkmk.title;
    }
    historyStack.push(bkmk);
    currentNode = bkmk;
  }

  function goBack() {
    if (historyStack.length <= 1) return;
    historyStack.pop()!;
    currentNode = historyStack[historyStack.length - 1];
  }

</script>

<svelte:head>
  <title>新标签页</title>
</svelte:head>

<main>
  <div class="top">
    <div class="bulr">
      {#each Array.from({ length: 10 }, (_, i) => i) as i}
        <span
          style="
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: {(i / 10) * 100}%;
            backdrop-filter: blur({(10 - i) * 1.1}px);
            opacity: {1 - i / 10};
            pointer-events: none;
          "
        ></span>
      {/each}
    </div>
    {@render headBar()}
    <Search {allBookmarksTree} />
  </div>
  <div class="content">
    <div class="tabs">
      {#if historyStack.length >= 3}
        <div class="left" in:fly={{ x: 100, duration: 300 }}>
          <button onclick={goBack} class="back">
            <T nowrap>返回</T>
          </button>
        </div>
      {/if}
      <div class="center">
        {#if historyStack.length <= 2}
          <Tab {tabs} onclick={(tab, i) => clickTab(tab, i)} />
        {:else}
          <T nowrap align="c">{historyStack[historyStack.length - 1].title}</T>
        {/if}
      </div>
    </div>
    <div class="tabs_contents">
    {#each tabs as tab (tab.key)}
      {#if tab.sel}
        <div
          class="tab_content"
          in:fly={firstMount
            ? undefined
            : { x: showNext ? 200 : -200, duration: 250 }}
          out:fly={firstMount
            ? undefined
            : { x: showNext ? -200 : 200, duration: 200 }}
        >
          {#if tab.key === "0"}
            {@render pinneds()}
          {:else if tab.key === "1"}
            {@render bookmarks()}
          {:else if tab.key === "2"}
            {@render history()}
          {/if}
        </div>
      {/if}
    {/each}
    </div>
  </div>
</main>

{#snippet headBar()}
  <G align="r" full>
    <Button iconName="Settings2" />
    {#if showSetting}
      <Settings />
    {/if}
  </G>
{/snippet}

{#snippet pinneds()}
  <Pinneds {allPinneds} onUpdate={(items) => (items !== undefined ? (allPinneds = items) : initPinneds())} />
{/snippet}

{#snippet bookmarks()}
  {#if !bookmarksPermission}
    {@render temNeedPermission("没有书签权限", "bookmarks")}
  {:else if currentNode}
    <Bookmarks
      list={historyStack.length >= 3}
      bookmarkNode={currentNode}
      onclickFolder={(bkmk) => clickFolder(bkmk)}
    />
  {/if}
{/snippet}

{#snippet history()}
  {#if !historyPermission}
    {@render temNeedPermission("没有历史记录权限", "history")}
  {:else}
    <History />
  {/if}
{/snippet}

{#snippet temNeedPermission(titl: string, permission: Permission)}
  <G vertical align="c">
    <T align="c">{titl}</T>
    <Button text="授权" onclick={() => clickGetPermission(permission)} />
  </G>
{/snippet}

<style>
  .top {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--gap);
    z-index: 2;
  }
  .bulr {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    overflow: hidden;
    /* top black, bottom transparent black */
    background: linear-gradient(
      to bottom,
      rgba(var(--c-bg-rgb), 1),
      rgba(var(--c-bg-rgb), 0)
    );
  }
  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    /* background: url(../../assets/bg3.jpg); */
    height: 100vh;
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
  }
  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 128px var(--gap) var(--gap) var(--gap);
    gap: var(--gap);
    width: 100%;
    max-width: 80%;
    box-sizing: border-box;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
  }

  /* On screens smaller than 1024px, use full width */
  @media screen and (max-width: 1024px) {
    .content {
      max-width: 100%;
    }
  }

  .tabs_contents {
    display: flex;
    flex-direction: row;
    width: 100%;
    box-sizing: border-box;
    position: relative;
    height: 100%;
  }
  .tab_content {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
  }
  .tabs {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
    height: 80px;
  }
  .tabs .center {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
  }
  .back {
    display: flex;
    background-color: unset;
    border: unset;
    border-radius: var(--r);
    padding: var(--gap);
  }
  .back:active {
    background-color: var(--c-mask);
    transform: translateY(2px);
    transition: all 0.1s ease-out;
  }
</style>
