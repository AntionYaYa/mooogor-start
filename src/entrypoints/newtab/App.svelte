<script lang="ts">
  import Search from "@/lib/Search.svelte";
  import Settings from "@/lib/Settings.svelte";
  import Button from "@/lib/components/Button.svelte";
  import G from "@/lib/components/G.svelte";
  import { hasPermission, requestPermission } from "./methods/getPermission";
  import type { Permission } from "./methods/getPermission";
  import { getBookmarks } from "./methods/getBookmarks";
  import type { BookmarkNode, BookmarkSubType } from "./methods/getBookmarks";
  import { getHistorys } from "./methods/getHistorys";
  import  { getAllWebSite } from "@/lib/DB/DB";
  import type { WebSite } from "@/lib/DB/DB";

  import Launch from "@/lib/launch.svelte";

  let showSetting = $state(false);
  let showLaunch = $state(true);

  let allPinneds: WebSite[] = $state([]);

  let bookmarksPermission = $state(false);
  let allBookmarksTree: BookmarkNode | undefined = $state();
  let allBookmarksBar: BookmarkNode | undefined = $state();
  let allBookmarksOther: BookmarkNode | undefined = $state();

  let historyPermission = $state(false);
  let AllHistory: BookmarkNode[] = $state([]);

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

    //为搜索准确
    allBookmarksBar = getTypeBookmarks(
      allBookmarksTree.children,
      "bookmarks-bar",
    );
    allBookmarksOther = getTypeBookmarks(allBookmarksTree.children, "other");
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
      if (bookmarksPermission) {
        initBookmarks();
      }
    }
    if (permission === "history") {
      historyPermission = await requestPermission(permission);
    }
  }

  function dragPinned(items: WebSite[]) {
    allPinneds = items;
  }
  function dragPinnedEnd(items: WebSite[]) {
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
    <Search {allBookmarksTree} />
  </div>
  {#if showLaunch}
    {#key allBookmarksTree}
      <Launch
        {allPinneds}
        {bookmarksPermission}
        {allBookmarksTree}
        {historyPermission}
        {AllHistory}
        onclickGetPms={(pms) => clickGetPermission(pms)}
      />
    {/key}
  {/if}
</main>

{#snippet headBar()}
  <G align="r" full>
    <Button iconName="Settings2" />
    {#if showSetting}
      <Settings />
    {/if}
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
</style>
