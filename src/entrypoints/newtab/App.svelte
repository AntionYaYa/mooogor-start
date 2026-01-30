<script lang="ts">
  import T from "@/lib/components/T.svelte";
  import Search from "../../lib/Search.svelte";
  import Settings from "../../lib/Settings.svelte";
  import Button from "../../lib/components/Button.svelte";
  import G from "../../lib/components/G.svelte";
  import Bookmarks from "@/lib/Bookmarks.svelte";
  import { hasPermission, requestPermission }  from "./methods/getPermission";
  import type { Permission } from "./methods/getPermission";
  import { getBookmarks } from "./methods/getBookmarks";
  import type { BookmarkNode,BookmarkSubType } from "./methods/getBookmarks";
  import { getHistorys } from "./methods/getHistorys";
  import type { HistoryItem } from "./methods/getHistorys";
    import History from "@/lib/History.svelte";

  let showSetting = $state(false);
  let bookmarksPermission: boolean = $state(false);
  let historyPermission: boolean = $state(false);
  // let allBookmarksTree: BookmarkNode[] = $state([]);
  let allBookmarksBar: BookmarkNode[] = $state([]);
  let allBookmarksOther: BookmarkNode[] = $state([]);
  let AllHistory: BookmarkNode[] = $state([]);


  init();

  async function init() {
    bookmarksPermission = await hasPermission("bookmarks");
    
    if (bookmarksPermission) {

      const allBookmarksTree = await getBookmarks();
      allBookmarksBar = getTypeBookmarks(allBookmarksTree,'bookmarks-bar')
      allBookmarksOther = getTypeBookmarks(allBookmarksTree,'other')
    }
    historyPermission = await hasPermission('history');
    if (historyPermission) {
      const allHistoryTree = await getHistorys();
      console.log(allHistoryTree)
    }
  }
 
  function getTypeBookmarks(allBookmarksTree:BookmarkNode[], subType: BookmarkSubType): BookmarkNode[] {
    if (!allBookmarksTree) return [];
    const topLevel = allBookmarksTree[0]?.children ?? [];
    const folder = topLevel.find((item) => item.folderType === subType);
    return folder?.children ?? [];
  }

  async function clickGetBkmkPer(permission: Permission) {
    bookmarksPermission = await requestPermission(permission);
    if (!bookmarksPermission) return;
  }
</script>

<svelte:head>
  <title>新标签页</title>
</svelte:head>

<main>
  {@render headBar()}
  <div class="content">
    <Search {allBookmarksBar} {allBookmarksOther} />
    {@render bookmarks()}
    {@render history()}
  </div>
</main>

{#snippet headBar()}
  <G align="r">
    <Button iconName="Settings2" />
    {#if showSetting}
      <Settings />
    {/if}
  </G>
{/snippet}

{#snippet bookmarks()}
  {#if !bookmarksPermission}
    {@render temNeedPermission('没有书签权限','bookmarks')}
  {:else}
    <Bookmarks {allBookmarksBar} />
  {/if}
{/snippet}

{#snippet history()}
  {#if !historyPermission}
    {@render temNeedPermission('没有历史记录权限','history')}
  {:else}
    <History {allBookmarksBar} />
  {/if}
{/snippet}

{#snippet temNeedPermission(titl:string,permission:Permission)}
  <G vertical align="c">
    <T align="c">{titl}</T>
    <Button text="授权" onclick={() => clickGetBkmkPer(permission)} />
  </G>
{/snippet}

<style>
  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--gap);
  }
</style>
