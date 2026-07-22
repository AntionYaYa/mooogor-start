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
  import BatchToolbar from "./components/BatchToolbar.svelte";
  import { tick, onMount, onDestroy } from "svelte";

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

  let multiSelectMode = $state(false);
  let selectedIds = $state<Set<string>>(new Set());
  let pageEl: HTMLElement | undefined = $state();
  let showBatchMove = $state(false);
  let batchMoveFolders = $state<BookmarkNode[]>([]);
  let lastClickedIndex = $state(-1);
  let batchActionLoading = $state(false);
  let batchErrorMessage = $state("");

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
    if (!currentBkmk) return false;
    if (isProtectedRootFolder(currentBkmk)) return false;
    const description = currentBkmk.url
      ? t("nt_delete_bookmark_confirm")
      : t("nt_delete_bookmark_folder_confirm");
    const title = currentBkmk.url
      ? t("nt_confirm_delete_bookmark_title")
      : t("nt_confirm_delete_bookmark_folder_title");
    if (!(await requestConfirm(title, description, t("nt_delete")))) return false;
    await deleteBookmark(currentBkmk.id);
    await refreshCurrentFolder();
    showMenu = false;
    showEdit = false;
    currentBkmk = undefined;
    return true;
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

  async function enterMultiSelect() {
    showMenu = false;
    const selectedBookmark = currentBkmk;
    multiSelectMode = true;
    selectedIds = selectedBookmark ? new Set([selectedBookmark.id]) : new Set();
    lastClickedIndex = selectedBookmark
      ? items.findIndex((b) => b.id === selectedBookmark.id)
      : -1;
    await tick();
    const selectedBtn = pageEl?.querySelector(
      ".item .sel",
    ) as HTMLElement | null;
    selectedBtn?.focus();
  }

  function clearSelection(force = false) {
    if (batchActionLoading && !force) return;
    multiSelectMode = false;
    selectedIds = new Set();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && multiSelectMode && !batchActionLoading) {
      clearSelection();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
  });

  onDestroy(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });

  function handleItemClick(_e: MouseEvent, bkmk: BookmarkNode, index: number) {
    if (batchActionLoading || isProtectedRootFolder(bkmk)) return;
    if (_e.shiftKey && lastClickedIndex >= 0) {
      _e.preventDefault();
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      const next = new Set<string>();
      for (let i = start; i <= end; i++) {
        if (!isProtectedRootFolder(items[i])) {
          next.add(items[i].id);
        }
      }
      selectedIds = next;
    } else {
      toggleSelect(bkmk);
      lastClickedIndex = index;
    }
  }

  function toggleSelect(bkmk: BookmarkNode) {
    if (batchActionLoading || isProtectedRootFolder(bkmk)) return;
    const next = new Set(selectedIds);
    if (next.has(bkmk.id)) {
      next.delete(bkmk.id);
    } else {
      next.add(bkmk.id);
    }
    if (next.size === 0) {
      multiSelectMode = false;
    }
    selectedIds = next;
  }

  function isSelected(bkmk: BookmarkNode) {
    return selectedIds.has(bkmk.id);
  }

  const selectedCount = $derived(selectedIds.size);
  const selectableItems = $derived(
    items.filter((bkmk) => !isProtectedRootFolder(bkmk)),
  );
  const allSelected = $derived(
    multiSelectMode &&
      selectableItems.length > 0 &&
      selectedCount === selectableItems.length,
  );

  function toggleSelectAll() {
    if (batchActionLoading) return;
    if (allSelected) {
      clearSelection(true);
    } else {
      selectedIds = new Set(selectableItems.map((b) => b.id));
    }
  }

  function buildFolderTreeExcluding(
    node: BookmarkNode | null,
    excludedIds: Set<string>,
  ): BookmarkNode[] {
    if (!node) return [];
    return (node.children ?? [])
      .filter((child) => !child.url)
      .filter((child) => !excludedIds.has(child.id))
      .map((child) => {
        const folder = child as BookmarkNode;
        return {
          ...folder,
          children: buildFolderTreeExcluding(folder, excludedIds),
        };
      });
  }

  async function openBatchMove() {
    if (!selectedCount || batchActionLoading) return;
    const [root] = await getBookmarks();
    const selectedFolderIds = new Set(
      items
        .filter((b) => selectedIds.has(b.id) && !b.url)
        .map((b) => b.id),
    );
    batchMoveFolders = buildFolderTreeExcluding(
      root as BookmarkNode,
      selectedFolderIds,
    );
    showBatchMove = true;
  }

  async function clickBatchMoveBookmark(parentId: string) {
    if (batchActionLoading) return;
    await runBatchAction((bkmk) => moveBookmark(bkmk.id, { parentId }));
    showBatchMove = false;
  }

  async function deleteSelected() {
    if (!selectedCount || batchActionLoading) return;
    if (
      !(await requestConfirm(
        t("nt_confirm_delete_bookmark_title"),
        t("nt_delete_bookmarks_confirm", String(selectedCount)),
        t("nt_delete"),
      ))
    ) {
      return;
    }
    await runBatchAction((bkmk) => deleteBookmark(bkmk.id));
  }

  async function runBatchAction(
    action: (bkmk: BookmarkNode) => Promise<unknown>,
  ) {
    const selectedBookmarks = items.filter(
      (bkmk) => selectedIds.has(bkmk.id) && !isProtectedRootFolder(bkmk),
    );
    if (!selectedBookmarks.length) return;
    batchActionLoading = true;
    batchErrorMessage = "";
    try {
      const results = await Promise.allSettled(selectedBookmarks.map(action));
      const failedCount = results.filter(
        (result) => result.status === "rejected",
      ).length;
      await refreshCurrentFolder();
      if (failedCount) {
        batchErrorMessage = t(
          "nt_batch_bookmarks_action_failed",
          String(failedCount),
        );
        return;
      }
      clearSelection();
    } finally {
      batchActionLoading = false;
    }
  }

  $effect(() => {
    const validIds = new Set(
      items
        .filter((bkmk) => !isProtectedRootFolder(bkmk))
        .map((bkmk) => bkmk.id),
    );
    const nextIds = [...selectedIds].filter((id) => validIds.has(id));
    if (nextIds.length !== selectedIds.size) {
      selectedIds = new Set(nextIds);
      if (!nextIds.length && !batchActionLoading) multiSelectMode = false;
    }
  });

</script>

<div class="page" bind:this={pageEl}>
  {#if items.length}
    <div
      class="content {list ? 'list' : 'grid'} {sorting ? 'sorting' : ''} {multiSelectMode
        ? 'multi_select'
        : ''}"
      use:dndzone={canSortItems
        ? {
            items,
            flipDurationMs: 200,
            type: `bookmark-${bookmarkNode.id}`,
            dropTargetStyle: {},
            zoneTabIndex: -1,
            zoneItemTabIndex: -1,
            transformDraggedElement: (e) => draggedel(e),
            dragDisabled: multiSelectMode,
            dropFromOthersDisabled: multiSelectMode,
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
      {#each items as bkmk, i (bkmk.id)}
        <div class="item" animate:flip={{ duration: 200 }}>
          {@render tembkmkWrapper(bkmk, i)}
        </div>
      {/each}
      {#if multiSelectMode}
        <div class="clear_btn_wrapper">
          <Button onclick={() => clearSelection()} disabled={batchActionLoading} r="r1">
            <G>
              <Icon name="X" color="var(--c-main)" />
            </G>
          </Button>
        </div>
      {/if}
    </div>
    <div class="batch_bar_container">
      <BatchToolbar
        show={multiSelectMode}
        count={selectedCount}
        {allSelected}
        showDeleteText
        showMoveText
        disabled={batchActionLoading}
        onselectall={toggleSelectAll}
        ondelete={deleteSelected}
        onmove={openBatchMove}
      />
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


{#snippet tembkmkWrapper(bkmk: BookmarkNode, i: number)}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class={list ? "bkmk_h" : "bkmk_v"}
    class:selected={multiSelectMode && list && isSelected(bkmk)}
    onclick={multiSelectMode && !isProtectedRootFolder(bkmk) && list ? (e) => handleItemClick(e, bkmk, i) : undefined}
    role={multiSelectMode && list ? "button" : undefined}
    tabindex={multiSelectMode && list ? 0 : undefined}
    onkeydown={multiSelectMode && !isProtectedRootFolder(bkmk) && list ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelect(bkmk); } } : undefined}
  >
    {#if multiSelectMode && !isProtectedRootFolder(bkmk)}
      {#if list}
        <G align="c">
          <BkmkIcon
            imgUrl={bkmk.url}
            alt={bkmk.title}
            size="s"
            folderIcon={!bkmk.url}
          />
        </G>
        <G full align="c">
          <T nowrap type="m">{bkmk.title}</T>
        </G>
      {:else}
        <Button onclick={(e) => handleItemClick(e, bkmk, i)} sel={isSelected(bkmk)} r="r1">
          <G>
            <BkmkIcon
              imgUrl={bkmk.url}
              alt={bkmk.title}
              size="l"
              folderIcon={!bkmk.url}
            />
          </G>
        </Button>
        <T nowrap align="c" type="s">{bkmk.title}</T>
      {/if}
    {:else}
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
    {/if}
  </div>
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
      <Button full onclick={enterMultiSelect}>
        <G>
          <T>{t("nt_multi_select")}</T>
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

{#if showBatchMove}
  <MoveBookmark
    bookmark={{
      id: "batch-move",
      parentId: bookmarkNode.id,
      title: "",
      url: "about:blank",
      children: [],
      syncing: false,
    }}
    folders={batchMoveFolders}
    onSave={clickBatchMoveBookmark}
    onclickClose={() => {
      showBatchMove = false;
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

{#if batchErrorMessage}
  <ConfirmDialog
    title={t("nt_batch_bookmarks_action_failed_title")}
    description={batchErrorMessage}
    onclickClose={() => {
      batchErrorMessage = "";
    }}
    onConfirm={() => {
      batchErrorMessage = "";
    }}
  />
{/if}

<style>
  .page {
    display: flex;
    flex-direction: column;
    width: 100%;
    align-items: center;
    height: 100%;
    position: relative;
  }

  .multi_select {
    outline: var(--c-main-3) 2px solid;
    position: relative;
    user-select: none;
  }

  .clear_btn_wrapper {
    position: absolute;
    bottom: 0;
    right: 0;
    z-index: 5;
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    background-color: var(--c-main-3);
    border-radius: var(--r1) 0 var(--r1) 0;
  }

  .batch_bar_container {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    justify-content: center;
    padding: var(--gap);
    pointer-events: none;
    z-index: 20;
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
  .list .item {
    padding: 0;
  }
  .list.multi_select .bkmk_h {
    padding: var(--gap);
    gap: 0;
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

  .bkmk_h.selected {
    outline: 2px solid var(--c-main);
    background-color: var(--c-main-3);
  }
  .bkmk_h.selected:hover {
    background-color: var(--c-main-3);
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
