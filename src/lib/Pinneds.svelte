<script lang="ts">
  import BkmkIcon from "./BkmkIcon.svelte";
  import T from "./components/T.svelte";
  import G from "./components/G.svelte";
  import { flip } from "svelte/animate";
  import { dndzone } from "svelte-dnd-action";
  import type { DndEvent } from "svelte-dnd-action";
  import {
    addWebSite,
    updateWebSite,
    deleteWebSite,
    updateWebSitesOrder,
  } from "@/lib/DB/DB";
  import type { WebSite } from "@/lib/DB/DB";
  import Button from "./components/Button.svelte";
  import AddPinned from "./AddPinned.svelte";
  import LinkContextMenu from "./LinkContextMenu.svelte";
  import NoData from "./NoData.svelte";
  import { t } from "@/lib/utils/i18n";

  interface Props {
    allPinneds: WebSite[] | [];
    newTabOpen?: boolean;
    showAdd: boolean;
    oncloseAdd: () => void;
    onUpdate: (items?: WebSite[]) => void;
  }

  let { allPinneds, newTabOpen = false, showAdd,oncloseAdd, onUpdate }: Props =
    $props();
  let isdarging = $state(false);
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
    el.style.backgroundColor = "var(--c-bg1)";
  }

  function handleConsider(e: CustomEvent<DndEvent<WebSite>>) {
    isdarging = true;
    onUpdate(e.detail.items);
  }

  async function handleFinalize(e: CustomEvent<DndEvent<WebSite>>) {
    isdarging = false;
    const items = e.detail.items;
    onUpdate(items);
    const withIds = items.filter((i): i is WebSite & { id: number } => !!i.id);
    if (withIds.length > 0) {
      await updateWebSitesOrder(withIds);
    }
  }

  async function clickSaveWebSite(newWebSite: WebSite) {
    if (currentPinned?.id) {
      await updateWebSite({ ...newWebSite, id: currentPinned.id });
    } else {
      await addWebSite(newWebSite);
    }
    onUpdate();
  }

  function clickEditWebSite() {
    oncloseAdd()
    showMenu = false;
  }
  async function clickDeleteWebSite() {
    showMenu = false;
    if (currentPinned?.id) {
      await deleteWebSite(currentPinned.id);
    }

    onUpdate();
  }
</script>

<div class="page">
  {#if allPinneds.length}
    <div
      class="content grid {isdarging ? 'drag' : ''}"
      use:dndzone={{
        items: allPinneds,
        flipDurationMs: 200,
        type: "pinneds",
        dropTargetStyle: {},
        zoneTabIndex: -1,
        zoneItemTabIndex: -1,
        transformDraggedElement: (e) => draggedel(e),
      }}
      onconsider={handleConsider}
      onfinalize={handleFinalize}
    >
      {#each allPinneds as pinned (pinned.id)}
        <div class="item" animate:flip={{ duration: 200 }}>
          <a
            href={pinned.url}
            target={newTabOpen ? "_blank" : "_self"}
            rel={newTabOpen ? "noreferrer" : undefined}
            class:ctx={showMenu && currentPinned?.id === pinned.id}
            oncontextmenu={(e) => showContextMenu(e, pinned)}
          >
            <BkmkIcon imgUrl={pinned.url} alt={pinned.title ?? ""} size="xl" />
          </a>
          <T nowrap align="c" type="s">{pinned.title}</T>
        </div>
      {/each}
    </div>
  {:else}
  <NoData text={t("nt_no_pinned")} />
  {/if}
</div>

{#if showAdd}
  <AddPinned
    urlValue={currentPinned?.url}
    titleValue={currentPinned?.title}
    onSave={clickSaveWebSite}
    onclickClose={oncloseAdd}
  />
{/if}

{#if showMenu && currentPinned}
    <LinkContextMenu
      x={menuX}
      y={menuY}
      url={currentPinned.url}
      onClose={() => (showMenu = false)}
    >
      <Button full onclick={clickEditWebSite}>
      <G>
        <T>{t("nt_edit")}</T>
      </G>
      </Button>
      <Button full onclick={clickDeleteWebSite}>
      <G>
        <T>{t("nt_delete")}</T>
      </G>
      </Button>
    </LinkContextMenu>
{/if}

<style>
  .page {
    display: flex;
    flex-direction: column;
    width: 100%;
    align-items: center;
  }
  .item {
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    border-radius: var(--r);
    cursor: default !important;
    gap: var(--gap);
    padding: var(--gap);
  }
  .content {
    gap: var(--gap);
    padding: var(--gap);
    width: 100%;
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
    margin: 0;
    border-radius: var(--r1);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--gap);
    box-sizing: border-box;
    background-color: var(--c-mask);
  }

  a:focus-visible {
    outline: var(--c-text) 2px solid;
  }

  a:active {
    background-color: var(--c-mask1);
  }
  
  a:focus{
    outline: 2px var(--c-text) solid;
  }
  a.ctx {
    outline: 2px var(--c-text) solid;
  }
</style>
