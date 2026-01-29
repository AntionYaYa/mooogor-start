<script lang="ts">
  import Search from "../../lib/Search.svelte";
  import Settings from "../../lib/Settings.svelte";
  import Button from "../../lib/components/Button.svelte";
  import G from "../../lib/components/G.svelte";

  type Permission = "bookmarks" | "history";
  type BookmarkNode = Browser.bookmarks.BookmarkTreeNode;

  let showSetting = $state(false);
  let bookmarksPermission: boolean = $state(false);
  let allBookmarksTree: BookmarkNode[] = $state([]);
  $inspect(allBookmarksTree)
  
  onMount(async () => {
    bookmarksPermission = await hasPermission("bookmarks");
    allBookmarksTree = await getBookmarks();
  });

  async function hasPermission(permission: Permission): Promise<boolean> {
    return await browser.permissions.contains({
      permissions: [permission],
    });
  }
  async function requestPermission(permission: Permission): Promise<boolean> {
    return await browser.permissions.request({
      permissions: [permission],
    });
  }
  async function clickGetBkmkPer(permission: Permission) {
    bookmarksPermission = await requestPermission(permission);
    if (!bookmarksPermission) return;
  }

  async function getBookmarks(): Promise<BookmarkNode[]> {
    return await browser.bookmarks.getTree();
  }
</script>

<svelte:head>
  <title>新标签页</title>
</svelte:head>

<main>
  <G align="r">
    <Button iconName="Settings2" />
    {#if showSetting}
      <Settings />
    {/if}
  </G>
  <div class="content">
    <Search {allBookmarksTree}/>
  </div>
  {@render temNeedPermission()}
</main>

{#snippet temNeedPermission()}
  <div>
    <h3>没有书签权限</h3>
    <button onclick={() => clickGetBkmkPer('bookmarks')}>授权</button>
  </div>
{/snippet}

<style>
  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--gap);
  }
</style>
