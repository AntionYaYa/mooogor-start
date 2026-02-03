<script lang="ts">
  import BkmkIcon from "./BkmkIcon.svelte";
  import T from "./components/T.svelte";
  import type { BookmarkNode } from "../entrypoints/newtab/methods/getBookmarks";

  interface Props {
    bookmarkNode: BookmarkNode;
    list?: boolean;
    onclickFolder: (bkmk: BookmarkNode) => void;
    ondragstart?: (bkmk: BookmarkNode) => void;
  }

  let { bookmarkNode, list,onclickFolder,ondragstart }: Props = $props();
  
  function clickFolder(e: Event, bkmk: BookmarkNode) {
    e.preventDefault();
    onclickFolder(bkmk);
  }

  function dragStart(e: Event, bkmk: BookmarkNode) {
    e.preventDefault();
    ondragstart?.(bkmk);
  }
</script>

<div class="content {list ? 'list' : 'grid'}">
  {#each bookmarkNode.children ?? [] as bkmk (bkmk.id)}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="item" draggable="true" ondragstart={(e) => dragStart(e, bkmk)}>
      {@render tembkmkWrapper(bkmk)}
    </div>
  {/each}
</div>

{#snippet tembkmkWrapper(bkmk: BookmarkNode)}
  <span class={list ? "bkmk_h" : "bkmk_v"}>
    {#if list}
      {#if bkmk.url}
        <a href={bkmk.url} target="_self" class="full-row">
          <BkmkIcon imgUrl={bkmk.url} alt={bkmk.title} size="s" />
          <T nowrap type="m">{bkmk.title}</T>
        </a>
      {:else}
        <button onclick={(e) => clickFolder(e, bkmk)} class="full-row">
          <BkmkIcon imgUrl={bkmk.url} alt={bkmk.title} size="s" />
          <T nowrap type="m">{bkmk.title}</T>
        </button>
      {/if}
    {:else}
      {#if bkmk.url}
        <a href={bkmk.url} target="_self">
          <BkmkIcon imgUrl={bkmk.url!} alt={bkmk.title} />
        </a>
      {:else}
        <button onclick={(e) => clickFolder(e, bkmk)}>
          <BkmkIcon imgUrl={bkmk.url!} alt={bkmk.title} />
        </button>
      {/if}
      <T nowrap align="c" type="s">{bkmk.title}</T>
    {/if}
  </span>
{/snippet}

<style>
  .item {
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    border-radius: var(--r);
  }
  .bkmk_v {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-items: center;
    gap: var(--gap);
    padding: var(--gap);
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    border-radius: var(--r);
    cursor: default;
  }
  .bkmk_h {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-items: center;
    gap: var(--gap);
    padding: var(--gap);
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    border-radius: var(--r);
    cursor: default;
  }
  .content {
    gap: var(--gap);
    padding: var(--gap);
    width: 100%;
    box-sizing: border-box;
    border-radius: var(--r1);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
  .list {
    display: flex;
    flex-direction: column;
    background-color: var(--c-bg1);
  }

  a {
    text-decoration: none;
    cursor: default;
    width: auto;
    height: auto;
    padding: 0;
    margin: 0;
    border-radius: var(--r1);
  }

  button {
    background-color: unset;
    border: unset;
    width: auto;
    height: auto;
    padding: 0;
    margin: 0;
    border-radius: var(--r1);
  }

  a:active,
  button:active {
    background-color: var(--c-mask);
    transform: translateY(2px);
    transition: all 0.1s ease-out;
  }

  .full-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    height: 100%;
    gap: var(--gap);
    padding: var(--gap);
    border-radius: var(--r);
    box-sizing: border-box;
  }
</style>
