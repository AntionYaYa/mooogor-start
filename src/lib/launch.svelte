<script lang="ts">
  import T from "@/lib/components/T.svelte";
  import Tab from "@/lib/components/Tab.svelte";
  import type { TabItem } from "@/lib/components/Tab.svelte";
  import Button from "@/lib/components/Button.svelte";
  import G from "@/lib/components/G.svelte";
  import Bookmarks from "@/lib/Bookmarks.svelte";
  import type { Permission } from "../entrypoints/newtab/methods/getPermission";
  import type { BookmarkNode } from "../entrypoints/newtab/methods/getBookmarks";
  import History from "@/lib/History.svelte";
  import Pinneds from "@/lib/Pinneds.svelte";
  import type { WebSite } from "@/lib/DB/DB";
  import { fly } from "svelte/transition";

  interface Props {
    allPinneds: WebSite[];
    bookmarksPermission: boolean;
    onclickGetPms: (permission: Permission) => void;
    allBookmarksTree: BookmarkNode | undefined;
    historyPermission: boolean;
    AllHistory: BookmarkNode[];
  }
  let {
    allPinneds,
    onclickGetPms,
    bookmarksPermission,
    allBookmarksTree,
    historyPermission,
    AllHistory,
  }: Props = $props();

  let tabs: TabItem[] = $state([
    { key: "0", name: "常用", sel: false },
    { key: "1", name: "书签", sel: false },
    { key: "2", name: "历史记录", sel: false },
  ]);

  let selTab: TabItem | undefined = $state();
  let showNext = $state(false);

  let currentNode: BookmarkNode | undefined = $state();
  let historyStack: BookmarkNode[] = $state([]);

  onMount(() => {
    clickTab(tabs[0], 0);
  });

  function clickTab(tab: TabItem, i: number) {
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
    initBookmarks();
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

  //先进书签栏
  async function initBookmarks() {
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

  function dragPinned(items: WebSite[]) {
    allPinneds = items;
  }
  function dragPinnedEnd(items: WebSite[]) {
    allPinneds = items;
  }
</script>

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
    <Button text="授权" onclick={() => onclickGetPms(permission)} />
  </G>
{/snippet}

<style>
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
