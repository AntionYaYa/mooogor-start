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
  import type { PinnedItem } from "@/lib/Pinneds.svelte";

  import Launch from "@/lib/launch.svelte";

  let showSetting = $state(false);
  let showLaunch = $state(true);

  let allPinneds: PinnedItem[] = $state([]);

  let bookmarksPermission = $state(false);
  let allBookmarksTree: BookmarkNode | undefined = $state();
  let allBookmarksBar: BookmarkNode | undefined = $state();
  let allBookmarksOther: BookmarkNode | undefined = $state();
  $inspect(allBookmarksTree)
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


  function initPinneds() {
    allPinneds = [
      {
        id: "1",
        order: 1,
        title: "谷歌",
        url: "https://www.google.com",
        iconUrl: "https://www.google.com/favicon.ico",
      },
      {
        id: "2",
        order: 2,
        title: "YouTube",
        url: "https://www.youtube.com",
        iconUrl: "https://www.youtube.com/favicon.ico",
      },
      {
        id: "3",
        order: 3,
        title: "GitHub",
        url: "https://github.com",
        iconUrl: "https://github.com/favicon.ico",
      },
      {
        id: "4",
        order: 4,
        title: "ChatGPT",
        url: "https://chat.openai.com",
        iconUrl: "https://chat.openai.com/favicon.ico",
      },
      {
        id: "5",
        order: 5,
        title: "Bilibili",
        url: "https://www.bilibili.com",
        iconUrl: "https://www.bilibili.com/favicon.ico",
      },
      {
        id: "6",
        order: 6,
        title: "知乎",
        url: "https://www.zhihu.com",
        iconUrl: "https://www.zhihu.com/favicon.ico",
      },
      {
        id: "7",
        order: 7,
        title: "Twitter / X",
        url: "https://x.com",
        iconUrl: "https://abs.twimg.com/favicons/twitter.ico",
      },
      {
        id: "8",
        order: 8,
        title: "掘金",
        url: "https://juejin.cn",
        iconUrl: "https://juejin.cn/favicon.ico",
      },
      {
        id: "9",
        order: 9,
        title: "StackOverflow",
        url: "https://stackoverflow.com",
        iconUrl: "https://stackoverflow.com/favicon.ico",
      },
      {
        id: "10",
        order: 10,
        title: "淘宝",
        url: "https://www.taobao.com",
        iconUrl: "https://www.taobao.com/favicon.ico",
      },
    ];
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
