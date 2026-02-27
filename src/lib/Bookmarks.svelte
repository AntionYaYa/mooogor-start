<script lang="ts">
  import BkmkIcon from "./BkmkIcon.svelte";
  import T from "./components/T.svelte";
  import type { BookmarkNode } from "../entrypoints/newtab/methods/getBookmarks";
  import { addToPinneds } from "@/lib/utils/pinneds";
  import LinkContextMenu from "./LinkContextMenu.svelte";
  import Button from "./components/Button.svelte";
  import NoData from "./NoData.svelte";
  import DragToPinneds from "./DragToPinneds.svelte";
  import { t } from "@/lib/utils/i18n";
  import G from "./components/G.svelte";

  interface Props {
    bookmarkNode: BookmarkNode;
    list?: boolean;
    newTabOpen?: boolean;
    onclickFolder: (bkmk: BookmarkNode) => void;
  }

  let {
    bookmarkNode,
    list,
    newTabOpen = false,
    onclickFolder,
  }: Props = $props();
  let currentBkmk: BookmarkNode | undefined = $state();
  let darging = $state(false);
  let showMenu = $state(false);

  let menuX = $state(0);
  let menuY = $state(0);

  function showContextMenu(e: MouseEvent, bkmk: BookmarkNode) {
    e.preventDefault();
    e.stopPropagation();

    currentBkmk = bkmk;
    menuX = e.clientX;
    menuY = e.clientY;
    showMenu = true;
  }

  function clickFolder(bkmk: BookmarkNode) {
    onclickFolder(bkmk);
  }

  function dragStart(e: DragEvent, bkmk: BookmarkNode) {
    currentBkmk = bkmk;
    e.dataTransfer?.setData("text/plain", bkmk.url ?? "");
    darging = true;
  }

  function ondragend() {
    darging = false;
  }

  async function clickAddtoPinneds() {
    showMenu = false;
    if (!currentBkmk) return;
    if (!currentBkmk.url) return;
    await addToPinneds(currentBkmk.url, currentBkmk.title);
    currentBkmk = undefined;
    darging = false;
  }
</script>

<DragToPinneds active={darging} onDrop={clickAddtoPinneds} />
<div class="page">
  {#if bookmarkNode.children?.length}
    <div class="content {list ? 'list' : 'grid'}">
      {#each bookmarkNode.children ?? [] as bkmk (bkmk.id)}
        <div class="item">
          {@render tembkmkWrapper(bkmk)}
        </div>
      {/each}
    </div>
  {:else}
    <NoData text={t("nt_no_bookmarks")} />
  {/if}
</div>

{#snippet tembkmkWrapper(bkmk: BookmarkNode)}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <span
    class={list ? "bkmk_h" : "bkmk_v"}
    draggable={!!bkmk.url}
    ondragstart={(e) => dragStart(e, bkmk)}
    {ondragend}
  >
    {#if list}
      {#if bkmk.url}
        <a
          href={bkmk.url}
          target={newTabOpen ? "_blank" : "_self"}
          rel={newTabOpen ? "noreferrer" : undefined}
          class="full-row"
          class:ctx={showMenu && currentBkmk === bkmk}
          oncontextmenu={(e) => showContextMenu(e, bkmk)}
        >
          <G align="c">
            <BkmkIcon imgUrl={bkmk.url} alt={bkmk.title} size="s" />
          </G>
          <G full align="c">
            <T nowrap type="m">{bkmk.title}</T>
          </G>
        </a>
      {:else}
        <button onclick={() => clickFolder(bkmk)} class="full-row">
          <G align="c">
            <BkmkIcon imgUrl={bkmk.url} alt={bkmk.title} size="s" folderIcon />
          </G>
          <G full align="c">
            <T nowrap type="m">{bkmk.title}</T>
          </G>
        </button>
      {/if}
    {:else}
      {#if bkmk.url}
        <a
          href={bkmk.url}
          target={newTabOpen ? "_blank" : "_self"}
          rel={newTabOpen ? "noreferrer" : undefined}
          class:ctx={showMenu && currentBkmk === bkmk}
          oncontextmenu={(e) => showContextMenu(e, bkmk)}
        >
        <G align="c">
          <BkmkIcon imgUrl={bkmk.url!} alt={bkmk.title} />
        </G>
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

{#if showMenu && currentBkmk}
  <LinkContextMenu
    x={menuX}
    y={menuY}
    url={currentBkmk.url ?? ""}
    onClose={() => (showMenu = false)}
  >
    <Button full onclick={clickAddtoPinneds}>
      <G>
        <T>{t("nt_add_to_pinned")}</T>
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
  }
  .bkmk_v {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-items: center;
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
    background-color: var(--c-bg1);
    margin: 0;
    border-radius: var(--r1);
    -webkit-user-drag: none;
  }
  a.ctx {
    outline: 2px var(--c-text) solid;
  }

  button {
    background-color: unset;
    border: unset;
    width: auto;
    height: auto;
    padding: var(--gap);
    margin: 0;
    border-radius: var(--r1);
    background-color: var(--c-bg1);
  }

  a:active,
  button:active {
    background-color: var(--c-mask);
    transition: all 0.1s ease-out;
  }
  button:focus-visible,
  a:focus-visible {
    outline: var(--c-text) 2px solid;
  }

  .full-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    height: 100%;
    padding: var(--gap);
    border-radius: var(--r);
    box-sizing: border-box;
  }
</style>
