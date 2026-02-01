<script lang="ts">
  import T from "@/lib/components/T.svelte";
  import Tab from "@/lib/components/Tab.svelte";
  import type { TabItem } from "@/lib/components/Tab.svelte";
  import Search from "@/lib/Search.svelte";
  import Settings from "@/lib/Settings.svelte";
  import Button from "@/lib/components/Button.svelte";
  import G from "@/lib/components/G.svelte";
  import Bookmarks from "@/lib/Bookmarks.svelte";
  import { hasPermission, requestPermission } from "./methods/getPermission";
  import type { Permission } from "./methods/getPermission";
  import { getBookmarks } from "./methods/getBookmarks";
  import type { BookmarkNode, BookmarkSubType } from "./methods/getBookmarks";
  import { getHistorys } from "./methods/getHistorys";
  import type { HistoryItem } from "./methods/getHistorys";
  import History from "@/lib/History.svelte";
  import Pinneds from "@/lib/Pinneds.svelte";
  import type { PinnedItem } from "@/lib/Pinneds.svelte";
  import { fly, slide } from "svelte/transition";

  let tabs: TabItem[] = $state([
    { key: "0", name: "常用", sel: false },
    { key: "1", name: "书签", sel: false },
    { key: "2", name: "历史记录", sel: false },
  ]);
  let selTab: TabItem | undefined = $state();
  let showNext = $state(false);

  let showSetting = $state(false);

  let allPinneds: PinnedItem[] = $state([]);

  let bookmarksPermission = $state(false);
  let allBookmarksBar: BookmarkNode | undefined = $state();
  let allBookmarksOther: BookmarkNode | undefined = $state();
  let currentNode: BookmarkNode | undefined = $state();
  let historyStack: BookmarkNode[] = $state([]);

  let historyPermission = $state(false);
  let AllHistory: BookmarkNode[] = $state([]);

  init();

  async function init() {
    clickTab(tabs[0], 0);
    initPinneds();
    bookmarksPermission = await hasPermission("bookmarks");
    initBookmarks(bookmarksPermission);
    historyPermission = await hasPermission("history");
    if (historyPermission) {
      const allHistoryTree = await getHistorys();
      console.log(allHistoryTree);
    }
  }

  function initPinneds() {
    allPinneds = [
      { id: "1", order: 1, title: "nihao", url: "https://www.baidu.com" },
    ];
  }

  async function initBookmarks(bookmarksPermission: boolean) {
    if (!bookmarksPermission) return;
    const allBookmarksTree = await getBookmarks();
    allBookmarksBar = getTypeBookmarks(allBookmarksTree, "bookmarks-bar");
    allBookmarksOther = getTypeBookmarks(allBookmarksTree, "other");
    if (!allBookmarksBar) return;
    clickFolder(allBookmarksTree[0]);
    if (currentNode?.children) {
      clickFolder(currentNode.children[0]);
    }
  }

  function getTypeBookmarks(
    allBookmarksTree: BookmarkNode[],
    subType: BookmarkSubType,
  ): BookmarkNode | undefined {
    const allbookmarks = allBookmarksTree[0]?.children;
    if (allbookmarks && subType === "bookmarks-bar") {
      return allbookmarks[0];
    }
    if (allbookmarks && subType === "other") {
      return allbookmarks[1];
    }
  }

  async function clickGetPermission(permission: Permission) {
    if (permission === "bookmarks") {
      bookmarksPermission = await requestPermission(permission);
    }
    if (permission === "history") {
      historyPermission = await requestPermission(permission);
    }
  }


  function clickTab(tab: TabItem, i: number) {
    if (tab.sel && historyStack.length === 2) {
      goBack();
    }

    if (tab.sel) return;
    if (selTab !== undefined) {
      const selTabIndex = tabs.findIndex((item) => item.key === selTab!.key);
      showNext = selTabIndex < i;
    }
    tabs.forEach((item) => {
      item.sel = item.key === tab.key;
    });

    selTab = tab;
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

  function dragPinned(items: PinnedItem[]) {
    allPinneds = items;
  }
  function dragPinnedEnd(items: PinnedItem[]) {
    allPinneds = items;
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
    <Search
      allBookmarksBars={allBookmarksBar?.children}
      allBookmarksOthers={allBookmarksOther?.children}
    />
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
      <!-- <div class="right"></div> -->
    </div>
    <div class="tabs_contents">
      {#if tabs[0].sel}
        <div
          class="tab_content"
          in:fly={{ x: showNext ? 200 : -200, duration: 250 }}
          out:fly={{ x: showNext ? -200 : 200, duration: 200 }}
        >
          {@render pinneds()}
        </div>
      {/if}
      {#if tabs[1].sel}
        <div
          class="tab_content"
          in:fly={{ x: showNext ? 200 : -200, duration: 250 }}
          out:fly={{ x: showNext ? -200 : 200, duration: 200 }}
        >
          {@render bookmarks()}
        </div>
      {/if}
      {#if tabs[2].sel}
        <div
          class="tab_content"
          in:fly={{ x: showNext ? 200 : -200, duration: 250 }}
          out:fly={{ x: showNext ? -200 : 200, duration: 200 }}
        >
          {@render history()}
        </div>
      {/if}
    </div>
  </div>
</main>
<!-- <ContextMenu/> -->

{#snippet headBar()}
  <G align="r" full>
    <Button iconName="Settings2" />
    {#if showSetting}
      <Settings />
    {/if}
  </G>
{/snippet}

{#snippet pinneds()}
  <Pinneds
    {allPinneds}
    ondrag={(items) => dragPinned(items)}
    ondragend={(items) => dragPinnedEnd(items)}
  />
{/snippet}

{#snippet bookmarks()}
  {#if !bookmarksPermission}
    {@render temNeedPermission("没有书签权限", "bookmarks")}
  {:else if currentNode}
    <Bookmarks
      list={historyStack.length >= 3}
      dragDisabled={historyStack.length <= 1}
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
  /* .bulr1{
    background-color: var(--c-mask);
    backdrop-filter: blur(16px);
  }
  .bulr2{
    background-color: var(--c-mask);
    backdrop-filter: blur(8px);
  }
  .bulr3{
    background-color: var(--c-mask);
    backdrop-filter: blur(4px);
  }
  .bulr4{
    background-color: var(--c-mask);
    backdrop-filter: blur(2px);
  } */

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
    /* background-color: black; */
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
    /* background-color: blue; */
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
