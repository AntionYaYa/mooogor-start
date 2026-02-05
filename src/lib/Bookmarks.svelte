<script lang="ts">
  import BkmkIcon from "./BkmkIcon.svelte";
  import T from "./components/T.svelte";
  import type { BookmarkNode } from "../entrypoints/newtab/methods/getBookmarks";
  import { slide } from "svelte/transition";

  interface Props {
    bookmarkNode: BookmarkNode;
    list?: boolean;
    onclickFolder: (bkmk: BookmarkNode) => void;
  }

  let { bookmarkNode, list, onclickFolder }: Props = $props();
  let currentBkmk: BookmarkNode | undefined = $state();
  $inspect(currentBkmk);
  let darging = $state(true);
  let darginBox = $state(false);

  function clickFolder(bkmk: BookmarkNode) {
    onclickFolder(bkmk);
  }

  function dragStart(e: DragEvent, bkmk: BookmarkNode) {
    currentBkmk = bkmk;
    darging = true;
  }

  function ondragend() {
    currentBkmk = undefined;
    darging = false;
  }
  function ondragenter(e: DragEvent) {
    darginBox = true;
  }
  function ondragleave(e: DragEvent) {
    darginBox = false;
  }
</script>

{#if darging}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="darg_g" transition:slide>
    <span class="darg_text">
      <T align="c">添加到常用</T>
    </span>
    <div
      class="darg_box"
      class:inbox={darginBox}
      {ondragenter}
      {ondragleave}
    ></div>
  </div>
{/if}

<div class="content {list ? 'list' : 'grid'}">
  {#each bookmarkNode.children ?? [] as bkmk (bkmk.id)}
    <div class="item">
      {@render tembkmkWrapper(bkmk)}
    </div>
  {/each}
</div>

{#snippet tembkmkWrapper(bkmk: BookmarkNode)}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <span class={list ? "bkmk_h" : "bkmk_v"} draggable="true" ondragstart={(e) => dragStart(e, bkmk)} {ondragend}>
    {#if list}
      {#if bkmk.url}
        <a href={bkmk.url} target="_self" class="full-row" draggable="false">
          <BkmkIcon imgUrl={bkmk.url} alt={bkmk.title} size="s" />
          <T nowrap type="m">{bkmk.title}</T>
        </a>
      {:else}
        <button onclick={(e) => clickFolder(bkmk)} class="full-row">
          <BkmkIcon imgUrl={bkmk.url} alt={bkmk.title} size="s" folderIcon />
          <T nowrap type="m">{bkmk.title}</T>
        </button>
      {/if}
    {:else}
      {#if bkmk.url}
        <a href={bkmk.url} target="_self">
          <BkmkIcon imgUrl={bkmk.url!} alt={bkmk.title} />
        </a>
      {:else}
        <button onclick={() => clickFolder(bkmk)}>
          <BkmkIcon imgUrl={bkmk.url!} alt={bkmk.title} folderIcon />
        </button>
      {/if}
      <T nowrap align="c" type="s">{bkmk.title}</T>
    {/if}
  </span>
{/snippet}

<style>
  .darg_text {
    position: absolute;
  }
  .darg_g {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 10;
    width: 100%;
    height: 200px;
    box-sizing: border-box;
    display: flex;
    padding: var(--gap);
    align-items: center;
    justify-content: center;
    flex-direction: row;
  }
  .darg_box {
    display: flex;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    background-color: var(--c-bg1);
    padding: var(--gap);
    border-radius: var(--r);
    align-items: center;
    justify-content: center;
    flex-direction: row;
    border: var(--c-text-2) dashed 2px;
  }
  .inbox {
    border: var(--c-text) dashed 2px;
  }
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
