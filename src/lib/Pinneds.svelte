<script lang="ts">
  import BkmkIcon from "./BkmkIcon.svelte";
  import T from "./components/T.svelte";
  import { flip } from "svelte/animate";
  import { dndzone } from "svelte-dnd-action";
  import type { DndEvent } from "svelte-dnd-action";
  import Favicon from "./Favicon.svelte";
  import type { WebSite } from "@/lib/DB/DB";
  import Button from "./components/Button.svelte";
    import AddPinned from "./AddPinned.svelte";

  interface Props {
    allPinneds: WebSite[] | [];
    ondrag: (items: WebSite[]) => void;
    ondragend: (items: WebSite[]) => void;
  }

  let { allPinneds, ondrag, ondragend }: Props = $props();
  let isdarging = $state(false);
  let showAdd = $state(false);

  function draggedel(el: HTMLElement | undefined) {
    if (!el) return;
    // 1. 获取当前元素的实际渲染尺寸
    el.style.backgroundColor = "var(--c-bg1)";
    el.style.borderRadius = "var(--r)";
  }

  function handleConsider(e: CustomEvent<DndEvent<WebSite>>) {
    isdarging = true;
    const items = e.detail.items;
    ondrag(items);
  }

  function handleFinalize(e: CustomEvent<DndEvent<WebSite>>) {
    isdarging = false;
    const items = e.detail.items;
    ondragend(items);
  }
</script>

<div
  class="content grid {isdarging ? 'drag' : ''}"
  use:dndzone={{
    items: allPinneds,
    flipDurationMs: 200,
    dropTargetStyle: {},
    transformDraggedElement: (e) => draggedel(e),
  }}
  onconsider={handleConsider}
  onfinalize={handleFinalize}
>
  {#each allPinneds as pinned (pinned.domain)}
    <div class="item" animate:flip={{ duration: 200 }}>
      <a href={pinned.url} target="_self">
        {@render tembkmk(pinned)}
      </a>
    </div>
  {/each}
</div>
{@render temAddPinned()}

{#if showAdd}
  <AddPinned ondSave={()=>{}}/>
{/if}

{#snippet temAddPinned()}
  <Button text="Add" onclick={()=>showAdd=true}/>
{/snippet}

{#snippet tembkmk(pinned: WebSite)}
  <span class="bkmk_v">
    <Favicon imgUrl={pinned.url} alt={pinned.title} />
    <T nowrap align="c" type="s">{pinned.title}</T>
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
  }
  .content {
    gap: var(--gap);
    padding: var(--gap);
    width: 80%;
    box-sizing: border-box;
    border-radius: var(--r);
  }
  .drag {
    outline: var(--c-mask) 2px dashed;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }

  a {
    text-decoration: none;
    cursor: default;
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    border-radius: var(--r);
  }

  a:active {
    background-color: var(--c-mask);
    transform: translateY(2px);
    transition: all 0.1s ease-out;
  }
</style>
