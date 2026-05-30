<script lang="ts">
  import EditBookmark from "./EditBookmark.svelte";
  import MoveBookmark from "./MoveBookmark.svelte";
  import ConfirmDialog from "./ConfirmDialog.svelte";
  import BkmkIcon from "./BkmkIcon.svelte";
  import T from "./components/T.svelte";
  import G from "./components/G.svelte";
  import { flip } from "svelte/animate";
  import { dndzone } from "svelte-dnd-action";
  import type { DndEvent } from "svelte-dnd-action";
  import type { BookmarkNode } from "@/lib/browser/bookmarks";
  import {
    getBookmarks,
    getBookmarkChildren,
    deleteBookmark,
    moveBookmark,
    updateBookmark,
  } from "@/lib/browser/bookmarks";
  import { addToPinneds } from "@/lib/utils/pinneds";
  import LinkContextMenu from "./LinkContextMenu.svelte";
  import Button from "./components/Button.svelte";
  import NoData from "./NoData.svelte";
  import { t } from "@/lib/utils/i18n";
  import Icon from "./components/Icon.svelte";

  interface Props {
    bookmarkNode: BookmarkNode;
    list?: boolean;
    newTabOpen?: boolean;
    onclickFolder: (bkmk: BookmarkNode) => void;
    onChanged?: () => void | Promise<void>;
  }

  let {
    bookmarkNode,
    list,
    newTabOpen = false,
    onclickFolder,
    onChanged,
  }: Props = $props();
  let currentBkmk: BookmarkNode | undefined = $state();
  let items = $state<BookmarkNode[]>([]);

  let showMenu = $state(false);
  let showEdit = $state(false);
  let showMove = $state(false);
  let confirmOptions = $state<{
    title: string;
    description: string;
    confirmText?: string;
    resolve: (value: boolean) => void;
  } | null>(null);
  let sorting = $state(false);
  let moveFolders = $state<BookmarkNode[]>([]);

  let menuX = $state(0);
  let menuY = $state(0);

  $effect(() => {
    items = [...(bookmarkNode.children ?? [])];
  });

  function notifyBookmarksUpdated() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("bookmarks-updated"));
  }

  function requestConfirm(
    title: string,
    description: string,
    confirmText?: string,
  ) {
    return new Promise<boolean>((resolve) => {
      confirmOptions = {
        title,
        description,
        confirmText,
        resolve,
      };
    });
  }

  function closeConfirm(result: boolean) {
    confirmOptions?.resolve(result);
    confirmOptions = null;
  }

  async function refreshCurrentFolder() {
    items = await getBookmarkChildren(bookmarkNode.id);
    await onChanged?.();
    notifyBookmarksUpdated();
  }

  function isProtectedRootFolder(node: BookmarkNode) {
    return !node.url && !!node.folderType;
  }

  const canSortItems = $derived(bookmarkNode.id !== "0");

  function showContextMenu(e: MouseEvent, bkmk: BookmarkNode) {
    e.preventDefault();
    e.stopPropagation();
    if (isProtectedRootFolder(bkmk)) {
      showMenu = false;
      currentBkmk = undefined;
      return;
    }

    currentBkmk = bkmk;
    menuX = e.clientX;
    menuY = e.clientY;
    showMenu = true;
  }

  function clickFolder(bkmk: BookmarkNode) {
    onclickFolder(bkmk);
  }

  function draggedel(el: HTMLElement | undefined) {
    if (!el) return;
    el.style.backgroundColor = "var(--c-bg1)";
    el.style.borderRadius = "var(--r1)";
  }

  function handleConsider(e: CustomEvent<DndEvent<BookmarkNode>>) {
    if (!canSortItems) return;
    sorting = true;
    items = e.detail.items;
  }

  async function handleFinalize(e: CustomEvent<DndEvent<BookmarkNode>>) {
    sorting = false;
    items = e.detail.items;
    if (!canSortItems) return;
    for (const [index, item] of items.entries()) {
      await moveBookmark(item.id, {
        parentId: bookmarkNode.id,
        index,
      });
    }
    await refreshCurrentFolder();
  }

  async function clickAddtoPinneds() {
    showMenu = false;
    if (!currentBkmk) return;
    if (!currentBkmk.url) return;
    await addToPinneds(currentBkmk.url, currentBkmk.title);
    currentBkmk = undefined;
  }

  function openFolderByKeyboard(event: KeyboardEvent, bkmk: BookmarkNode) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    clickFolder(bkmk);
  }

  function clickEditBookmark(bkmk: BookmarkNode) {
    if (isProtectedRootFolder(bkmk)) return;
    currentBkmk = bkmk;
    showMenu = false;
    showEdit = true;
  }

  async function clickSaveBookmark(nextValue: { title: string; url?: string }) {
    if (!currentBkmk) return;
    if (isProtectedRootFolder(currentBkmk)) return;
    const changes = currentBkmk.url
      ? { title: nextValue.title, url: nextValue.url }
      : { title: nextValue.title };
    await updateBookmark(currentBkmk.id, changes);
    await refreshCurrentFolder();
    showEdit = false;
  }

  async function clickDeleteBookmark() {
    if (!currentBkmk) return;
    if (isProtectedRootFolder(currentBkmk)) return;
    const description = currentBkmk.url
      ? t("nt_delete_bookmark_confirm")
      : t("nt_delete_bookmark_folder_confirm");
    const title = currentBkmk.url
      ? t("nt_confirm_delete_bookmark_title")
      : t("nt_confirm_delete_bookmark_folder_title");
    if (!(await requestConfirm(title, description, t("nt_delete")))) return;
    await deleteBookmark(currentBkmk.id);
    await refreshCurrentFolder();
    showMenu = false;
    showEdit = false;
    currentBkmk = undefined;
  }

  function findNodeById(node: BookmarkNode | null, id: string): BookmarkNode | null {
    if (!node) return null;
    if (node.id === id) return node;
    for (const child of node.children ?? []) {
      const found = findNodeById(child as BookmarkNode, id);
      if (found) return found;
    }
    return null;
  }

  function buildFolderTree(
    node: BookmarkNode | null,
    excludedFolderId?: string,
  ): BookmarkNode[] {
    if (!node) return [];
    return (node.children ?? [])
      .filter((child) => !child.url)
      .filter((child) => child.id !== excludedFolderId)
      .map((child) => {
        const folder = child as BookmarkNode;
        return {
          ...folder,
          children: buildFolderTree(folder, excludedFolderId),
        };
      });
  }

  async function openMoveBookmark(bkmk: BookmarkNode) {
    if (isProtectedRootFolder(bkmk)) return;
    currentBkmk = bkmk;
    showMenu = false;
    const [root] = await getBookmarks();
    const currentFolderNode = !bkmk.url
      ? findNodeById(root as BookmarkNode, bkmk.id)
      : null;
    moveFolders = buildFolderTree(root as BookmarkNode, currentFolderNode?.id);
    showMove = true;
  }

  async function clickMoveBookmark(parentId: string) {
    if (!currentBkmk) return;
    if (isProtectedRootFolder(currentBkmk)) return;
    await moveBookmark(currentBkmk.id, { parentId });
    await refreshCurrentFolder();
    showMove = false;
  }

</script>

<div class="page">
  {#if items.length}
    <div
      class="content {list ? 'list' : 'grid'} {sorting ? 'sorting' : ''}"
      use:dndzone={canSortItems
        ? {
            items,
            flipDurationMs: 200,
            type: `bookmark-${bookmarkNode.id}`,
            dropTargetStyle: {},
            zoneTabIndex: -1,
            zoneItemTabIndex: -1,
            transformDraggedElement: (e) => draggedel(e),
          }
        : {
            items,
            flipDurationMs: 200,
            type: `bookmark-${bookmarkNode.id}`,
            dropTargetStyle: {},
            zoneTabIndex: -1,
            zoneItemTabIndex: -1,
            transformDraggedElement: (e) => draggedel(e),
            dragDisabled: true,
            dropFromOthersDisabled: true,
          }}
      onconsider={handleConsider}
      onfinalize={handleFinalize}
    >
      {#each items as bkmk (bkmk.id)}
        <div class="item" animate:flip={{ duration: 200 }}>
          {@render tembkmkWrapper(bkmk)}
        </div>
      {/each}
    </div>
  {:else}
    <NoData iconName='Bookmark' title={t("nt_no_bookmarks")} />
  {/if}
</div>

{#snippet temText(list: boolean, text: string)}
  {@const hasText = !!text}
  {@const value = hasText ? text : "--"}
  {@const color = hasText ? undefined : "var(--c-text-2)"}

  {#if list}
    <G full align="c">
      <T nowrap type="m" color={color}>{value}</T>
    </G>
  {:else}
    <T nowrap align="c" type="s" color={color}>{value}</T>
  {/if}
{/snippet}


{#snippet tembkmkWrapper(bkmk: BookmarkNode)}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <span
    class={list ? "bkmk_h" : "bkmk_v"}
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
          {@render temText(list, bkmk.title)}
        </a>
      {:else}
        <div
          class="full-row folder_card"
          class:ctx={showMenu && currentBkmk === bkmk}
          role="button"
          tabindex="0"
          onclick={() => clickFolder(bkmk)}
          onkeydown={(e) => openFolderByKeyboard(e, bkmk)}
          oncontextmenu={(e) => showContextMenu(e, bkmk)}
        >
          <G align="c">
            <BkmkIcon imgUrl={bkmk.url} alt={bkmk.title} size="s" folderIcon />
          </G>
          <G full align="c">
            <T nowrap type="m">{bkmk.title}</T>
          </G>
          <G align="c">
            <Icon name="ChevronRight" color="var(--c-text-1)"opacity={0.6} />
          </G>
        </div>
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
        <div
          class="folder_card"
          class:ctx={showMenu && currentBkmk === bkmk}
          role="button"
          tabindex="0"
          onclick={() => clickFolder(bkmk)}
          onkeydown={(e) => openFolderByKeyboard(e, bkmk)}
          oncontextmenu={(e) => showContextMenu(e, bkmk)}
        >
          <BkmkIcon imgUrl={bkmk.url!} alt={bkmk.title} folderIcon />
        </div>
      {/if}
      {@render temText(false, bkmk.title)}
    {/if}
  </span>
{/snippet}

{#if showMenu && currentBkmk}
  <LinkContextMenu
    x={menuX}
    y={menuY}
    url={currentBkmk.url ?? ""}
    showDefaultActions={!!currentBkmk.url}
    onClose={() => (showMenu = false)}
  >
    {#if currentBkmk.url}
      <Button full onclick={clickAddtoPinneds}>
        <G>
          <T>{t("nt_add_to_pinned")}</T>
        </G>
      </Button>
    {/if}
    {#if !isProtectedRootFolder(currentBkmk)}
      <Button full onclick={() => clickEditBookmark(currentBkmk!)}>
        <G>
          <T>{t("nt_edit")}</T>
        </G>
      </Button>
      <Button full onclick={() => void openMoveBookmark(currentBkmk!)}>
        <G>
          <T>{t("nt_move")}</T>
        </G>
      </Button>
      <Button full onclick={() => void clickDeleteBookmark()}>
        <G>
          <T color='var(--c-red)'>{t("nt_delete")}</T>
        </G>
      </Button>
    {/if}
  </LinkContextMenu>
{/if}

{#if showEdit && currentBkmk}
  <EditBookmark
    bookmark={currentBkmk}
    onSave={clickSaveBookmark}
    onDelete={clickDeleteBookmark}
    onclickClose={() => {
      showEdit = false;
    }}
  />
{/if}

{#if showMove && currentBkmk}
  <MoveBookmark
    bookmark={currentBkmk}
    folders={moveFolders}
    onSave={clickMoveBookmark}
    onclickClose={() => {
      showMove = false;
    }}
  />
{/if}

{#if confirmOptions}
  <ConfirmDialog
    title={confirmOptions.title}
    description={confirmOptions.description}
    confirmText={confirmOptions.confirmText}
    onclickClose={() => closeConfirm(false)}
    onConfirm={() => closeConfirm(true)}
  />
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
    padding: var(--gap);
    width: 100%;
  }
  .bkmk_v {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-items: center;
    padding: var(--gap);
    gap: var(--gap);
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
    justify-content: space-between;
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
  .content.sorting {
    outline: var(--c-mask) 2px dashed;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
  .list {
    display: flex;
    flex-direction: column;
  }

  a {
    text-decoration: none;
    cursor: default;
    width: auto;
    height: auto;
    margin: 0;
    border-radius: var(--r1);
    -webkit-user-drag: none;
    flex: 1;
  }
  a.ctx {
    outline: 2px var(--c-text) solid;
  }
  .folder_card.ctx {
    outline: 2px var(--c-text) solid;
  }

  .folder_card {
    display: flex;
    align-items: center;
    justify-content: center;
    width: auto;
    height: auto;
    margin: 0;
    padding: var(--gap);
    border-radius: var(--r1);
    cursor: default;
  }
  a:hover {
    background-color: var(--c-mask);
  }
  .folder_card:hover {
    background-color: var(--c-mask);
  }
  a:active,
  .folder_card:active {
    background-color: var(--c-mask1);
  }
  a:focus-visible,
  .folder_card:focus-visible {
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
  .item {
    cursor: default !important;
  }
</style>
