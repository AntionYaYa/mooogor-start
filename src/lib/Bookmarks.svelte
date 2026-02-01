<script lang="ts">
  import BkmkIcon from "./BkmkIcon.svelte";
  import T from "./components/T.svelte";
  import type { BookmarkNode } from "../entrypoints/newtab/methods/getBookmarks";
  import { moveBookmark } from "../entrypoints/newtab/methods/getBookmarks";
  import { flip } from "svelte/animate";
  import { dndzone } from "svelte-dnd-action";
  import type { DndEvent } from "svelte-dnd-action";

  interface Props {
    bookmarkNode: BookmarkNode;
    list?: boolean;
    dragDisabled: boolean;
    onclickFolder: (bkmk: BookmarkNode) => void;
  }

  let { bookmarkNode, list, dragDisabled,onclickFolder }: Props = $props();

  let bookmarks: BookmarkNode[] = $state([]);
  let isdarging: boolean = $state(false);

  // 当 bookmarkNode 变化时同步 children
  $effect(() => {
    bookmarks = bookmarkNode.children ? [...bookmarkNode.children] : [];
  });
  function clickFolder(e: Event, bkmk: BookmarkNode) {
    e.preventDefault();
    onclickFolder(bkmk);
  }

  function handleConsider(e: CustomEvent<DndEvent<BookmarkNode>>) {
    isdarging = true;
    const items = e.detail.items;
    bookmarks = items;
  }

  function handleFinalize(e: CustomEvent<DndEvent<BookmarkNode>>) {
    isdarging = false;
    bookmarks = e.detail.items;
    const dragedBkmk = bookmarks.find((item) => item.id === e.detail.info.id);
    if (!dragedBkmk) return;
    const parentId = dragedBkmk.parentId;
    if (!parentId) return;
    saveMoveToBrowser(parentId);
  }

  async function saveMoveToBrowser(parentId: string) {
    for (let i = 0; i < bookmarks.length; i++) {
      const b = bookmarks[i];
      await moveBookmark(b.id, parentId, i);
    }
  }

  function draggedel(el: HTMLElement | undefined) {
    if (!el) return;
    // 1. 获取当前元素的实际渲染尺寸
    el.style.backgroundColor = "var(--c-bg1)";
    el.style.borderRadius = "var(--r)";
  }
</script>

<div
  class="content {list ? 'list' : 'grid'} {isdarging ? 'drag' : ''}"
  use:dndzone={{
    items: bookmarks,
    flipDurationMs: 200,
    dragDisabled: dragDisabled,
    dropTargetStyle: {},
    transformDraggedElement: (e) => draggedel(e),
  }}
  onconsider={handleConsider}
  onfinalize={handleFinalize}
>
  {#each bookmarks as bkmk (bkmk.id)}
    <div class="item" animate:flip={{ duration: 200 }}>
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
  .drag {
    outline: var(--c-mask) 2px dashed;
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
    border-radius: var(--r);
  }

  button {
    background-color: unset;
    border: unset;
    width: auto;
    height: auto;
    padding: 0;
    margin: 0;
    border-radius: var(--r);
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
