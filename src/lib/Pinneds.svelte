<script lang="ts">
  import BkmkIcon from "./BkmkIcon.svelte";
  import T from "./components/T.svelte";
  import { flip } from "svelte/animate";
  import { dndzone } from "svelte-dnd-action";
  import type { DndEvent } from "svelte-dnd-action";
  import Favicon from "./Favicon.svelte";
  import { saveWebSite,deleteWebSite } from "@/lib/DB/DB";
  import type { WebSite } from "@/lib/DB/DB";
  import Button from "./components/Button.svelte";
  import AddPinned from "./AddPinned.svelte";
  import LinkContextMenu from "./LinkContextMenu.svelte";

  interface Props {
    allPinneds: WebSite[] | [];
    ondrag: (items: WebSite[]) => void;
    ondragend: (items: WebSite[]) => void;
    onChange: () => void;
  }

  let { allPinneds, ondrag, ondragend, onChange }: Props = $props();
  let isdarging = $state(false);
  let showAdd = $state(false);
  let currentPinned: WebSite | undefined = $state();

  let menuX = $state(0);
  let menuY = $state(0);

  let showMenu = $state(false);

  function showContextMenu(e: MouseEvent, pinned: WebSite) {
    e.preventDefault();
    e.stopPropagation();

    currentPinned = pinned;
    menuX = e.clientX;
    menuY = e.clientY;
    showMenu = true;
  }

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

  async function clickSaveWebSite(newWebSite: WebSite) {
    await saveWebSite(newWebSite);
    onChange();
  }
  function clickEditWebSite() {
      showAdd = true
      showMenu =false
  }
  async function clickDeleteWebSite() {
    showMenu =false
    if (currentPinned) {
      await deleteWebSite(currentPinned.domain);
    }

    onChange();
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
      <a
        href={pinned.url}
        target="_self"
        oncontextmenu={(e) => showContextMenu(e, pinned)}
      >
        <BkmkIcon imgUrl={pinned.url} alt={pinned.title ?? ""} size="xl" />
        <T nowrap align="c" type="s">{pinned.title}</T>
      </a>
    </div>
  {/each}
</div>
{@render temAddPinned()}

{#if showAdd}
  <AddPinned
    urlValue={currentPinned?.url}
    titleValue={currentPinned?.title}
    onSave={clickSaveWebSite}
    onclickClose={() => (showAdd = false)}
  />
{/if}

{#if showMenu && currentPinned}
  <LinkContextMenu
    x={menuX}
    y={menuY}
    url={currentPinned.url}
    onClose={() => (showMenu = false)}
  >
    <Button full text="编辑" onclick={clickEditWebSite} />
    <Button full text="删除" onclick={clickDeleteWebSite} />
  </LinkContextMenu>
{/if}

{#snippet temAddPinned()}
  <Button iconName="Plus" onclick={() => (showAdd = true)} />
{/snippet}

<style>
  .item {
    display: flex;
    flex-direction: column;
    align-items: center;
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
    margin: 0;
    border-radius: var(--r);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--gap);
    padding: var(--gap);
  }

  a:active {
    background-color: var(--c-mask);
    transform: translateY(2px);
    transition: all 0.1s ease-out;
  }
</style>
