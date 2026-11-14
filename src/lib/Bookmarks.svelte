<script module lang="ts">
  // Remember recent folders without retaining their bookmark data.
  const folderScrollPositions = new Map<string, number>();
</script>

<script lang="ts">
  import EditBookmark from "./EditBookmark.svelte";
  import AddBookmark from "./AddBookmark.svelte";
  import MoveBookmark from "./MoveBookmark.svelte";
  import ConfirmDialog from "./ConfirmDialog.svelte";
  import BkmkIcon from "./BkmkIcon.svelte";
  import BookmarkFolderIcon from "./BookmarkFolderIcon.svelte";
  import T from "./components/T.svelte";
  import G from "./components/G.svelte";
  import { flip } from "svelte/animate";
  import {
    dndzone,
    SHADOW_ITEM_MARKER_PROPERTY_NAME,
  } from "svelte-dnd-action";
  import type { ActionReturn } from "svelte/action";
  import type { Options, DndZoneAttributes } from "svelte-dnd-action";
  import type { DndEvent } from "svelte-dnd-action";
  import type { BookmarkNode } from "@/lib/browser/bookmarks";
  import {
    getBookmarks,
    moveBookmarksBefore,
    getBookmarkChildren,
    createBookmark,
    deleteBookmark,
    moveBookmark,
    updateBookmark,
  } from "@/lib/browser/bookmarks";
  import { addToPinneds } from "@/lib/utils/pinneds";
  import { createDragCombineHover, DRAG_HOVER_DELAY_MS } from "@/lib/utils/dragCombineHover";
  import LinkContextMenu from "./LinkContextMenu.svelte";
  import Button from "./components/Button.svelte";
  import NoData from "./NoData.svelte";
  import { t } from "@/lib/utils/i18n";
  import Icon from "./components/Icon.svelte";
  import BatchToolbar from "./components/BatchToolbar.svelte";
  import { bookmarkWindow } from "@/lib/browser/virtualBookmarks";
  import { tick, onMount, onDestroy, untrack } from "svelte";

  interface Props {
    bookmarkNode: BookmarkNode;
    scrollRoot?: HTMLElement;
    headerHeight: number;
    showAddBookmark?: boolean;
    list?: boolean;
    newTabOpen?: boolean;
    settingsOpen?: boolean;
    onclickFolder: (bkmk: BookmarkNode) => void;
    onback?: () => void;
    onChanged?: () => void | Promise<void>;
  }

  let {
    bookmarkNode,
    scrollRoot,
    headerHeight,
    showAddBookmark = $bindable(false),
    list,
    newTabOpen = false,
    settingsOpen = false,
    onclickFolder,
    onback,
    onChanged,
  }: Props = $props();
  const folderId = untrack(() => bookmarkNode.id);
  let currentBkmk: BookmarkNode | undefined = $state();
  // svelte-ignore state_referenced_locally -- 父级通过 {#key currentNode.id} 在切换目录时重挂本组件，items 只需初始化一次
  let items = $state<BookmarkNode[]>([...(bookmarkNode.children ?? [])]);

  let lastExternalChildren = untrack(() => bookmarkNode.children);
  $effect(() => {
    const children = bookmarkNode.children;
    if (children !== lastExternalChildren) {
      lastExternalChildren = children;
      if (children) items = [...children];
    }
  });

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
  let folderPreviewUrls = $state<Record<string, string[]>>({});
  let folderPreviewRequestId = 0;
  let draggedBookmarkId = $state<string | null>(null);
  let combineTargetId = $state<string | undefined>();
  const combineHover = createDragCombineHover((id) => (combineTargetId = id));
  let dragStartItems = $state<BookmarkNode[]>([]);
  let batchDragIds = $state<string[]>([]);
  let batchDragIconSnapshots: HTMLElement[] = [];
  let pendingReorderItems: BookmarkNode[] | null = null;
  let pendingReorderSignature = "";
  let reorderDelayId: ReturnType<typeof setTimeout> | null = null;

  let scrollEl: HTMLDivElement | undefined = $state();
  let scrollTop = $state(0);
  let viewportWidth = $state(1000);
  let viewportHeight = $state(600);
  const virtualized = $derived(items.length > 200);
  const windowRange = $derived(bookmarkWindow(items.length, viewportWidth, viewportHeight, scrollTop, !!list));
  const renderedItems = $derived.by(() => {
    if (!virtualized) return items.map((item, index) => ({ item, index }));
    const visible = items.slice(windowRange.start, windowRange.end).map((item, offset) => ({ item, index: windowRange.start + offset }));
    // Keep the native drag source mounted while scrolling across windows.
    const draggedIndex = draggedBookmarkId ? items.findIndex(item => item.id === draggedBookmarkId) : -1;
    if (draggedIndex >= 0 && (draggedIndex < windowRange.start || draggedIndex >= windowRange.end)) visible.push({ item: items[draggedIndex], index: draggedIndex });
    return visible;
  });

  function updateViewport(root: HTMLElement, region: HTMLElement) {
    const rootRect = root.getBoundingClientRect();
    const regionRect = region.getBoundingClientRect();
    const viewportTop = rootRect.top + headerHeight;
    viewportWidth = region.clientWidth;
    viewportHeight = Math.max(0, rootRect.bottom - Math.max(viewportTop, regionRect.top));
    scrollTop = Math.max(0, viewportTop - regionRect.top);
  }

  function trackViewport(region: HTMLElement, initialRoot?: HTMLElement) {
    let stopTracking: (() => void) | undefined;
    const update = (root?: HTMLElement) => {
      stopTracking?.();
      stopTracking = undefined;
      if (!root) return;

      const measure = () => updateViewport(root, region);
      const handleScroll = () => {
        folderScrollPositions.set(folderId, root.scrollTop);
        measure();
      };
      const observer = new ResizeObserver(measure);
      observer.observe(root);
      observer.observe(region);
      root.scrollTop = folderScrollPositions.get(folderId) ?? 0;
      root.addEventListener("scroll", handleScroll, { passive: true });
      measure();

      stopTracking = () => {
        observer.disconnect();
        root.removeEventListener("scroll", handleScroll);
      };
    };

    update(initialRoot);
    return { update, destroy: () => stopTracking?.() };
  }

  function virtualItemStyle(index: number) {
    if (!virtualized) return undefined;
    const { columns, pitch, cellWidth, cellHeight } = windowRange;
    return `position:absolute;left:${5 + (index % columns) * (cellWidth + 5)}px;top:${5 + Math.floor(index / columns) * pitch}px;width:${cellWidth}px;height:${cellHeight}px`;
  }

  function bookmarkDnd(node: HTMLElement, options: Options<BookmarkNode>): ActionReturn<Options<BookmarkNode>, DndZoneAttributes<BookmarkNode>> {
    let action: ActionReturn<Options<BookmarkNode>, DndZoneAttributes<BookmarkNode>> | undefined;
    const update = (next: Options<BookmarkNode>) => {
      if (virtualized) { action?.destroy?.(); action = undefined; }
      else if (action) action.update?.(next);
      else action = dndzone(node, next);
    };
    update(options);
    return { update, destroy: () => action?.destroy?.() };
  }

  function nativeDragStart(event: DragEvent, item: BookmarkNode) {
    if (!virtualized) return;
    if (!canSortItems || batchActionLoading || isProtectedRootFolder(item)) { event.preventDefault(); return; }
    combineHover.reset();
    draggedBookmarkId = item.id;
    dragStartItems = [...items];
    if (multiSelectMode && !selectedIds.has(item.id)) selectedIds = new Set([item.id]);
    batchDragIds = multiSelectMode ? items.filter(node => selectedIds.has(node.id)).map(node => node.id) : [];
    sorting = true;
    event.dataTransfer?.setData("text/plain", item.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  }

  function nativeDragOver(event: DragEvent) {
    if (!virtualized || !draggedBookmarkId) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    combineHover.update(findCombineTarget(event.clientX, event.clientY));
    if (scrollRoot) {
      const rect = scrollRoot.getBoundingClientRect();
      if (event.clientY < rect.top + headerHeight + 45) scrollRoot.scrollTop -= 35;
      else if (event.clientY > rect.bottom - 45) scrollRoot.scrollTop += 35;
    }
  }

  function nativeDragEnd() {
    if (!virtualized) return;
    sorting = false;
    draggedBookmarkId = null;
    combineHover.reset();
    batchDragIds = [];
  }

  async function nativeDrop(event: DragEvent) {
    if (!virtualized || !draggedBookmarkId) return;
    event.preventDefault();
    const sourceId = draggedBookmarkId;
    const selected = batchDragIds.length ? [...batchDragIds] : [sourceId];
    const selectedSet = new Set(selected);
    const targetElement = (event.target as HTMLElement).closest<HTMLElement>("[data-bookmark-id]");
    const target = items.find(node => node.id === targetElement?.dataset.bookmarkId);
    if (!target || selectedSet.has(target.id)) { nativeDragEnd(); return; }
    combineHover.capture(findCombineTarget(event.clientX, event.clientY));
    batchActionLoading = true;
    try {
      if (combineHover.releasedId) {
        await handleFinalize(new CustomEvent("finalize", { detail: { items: [...items], info: { id: sourceId, trigger: "droppedIntoZone" } } }) as CustomEvent<DndEvent<BookmarkNode>>);
      } else {
        const remaining = items.filter(node => !selectedSet.has(node.id));
        const rect = targetElement!.getBoundingClientRect();
        const after = list ? event.clientY > rect.top + rect.height / 2 : event.clientX > rect.left + rect.width / 2;
        const insertion = remaining.findIndex(node => node.id === target.id) + (after ? 1 : 0);
        await moveBookmarksBefore(selected, bookmarkNode.id, remaining[insertion]?.id);
        await refreshCurrentFolder();
      }
    } catch (error) {
      console.error("[Mooogor Bookmarks]", "drag:failed", error);
      batchErrorMessage = t("nt_batch_bookmarks_action_failed", "1");
      await refreshCurrentFolder();
    } finally { batchActionLoading = false; nativeDragEnd(); }
  }

  function virtualKeyboardEvents(node: HTMLElement) {
    node.addEventListener("keydown", virtualKeyboard);
    return { destroy: () => node.removeEventListener("keydown", virtualKeyboard) };
  }

  async function virtualKeyboard(event: KeyboardEvent) {
    if (!virtualized || !["Tab", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const element = (event.target as HTMLElement).closest<HTMLElement>("[data-bookmark-id]");
    if (!element) return;
    const index = items.findIndex(item => item.id === element.dataset.bookmarkId);
    let next = index;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else if (event.key === "ArrowUp") next -= windowRange.columns;
    else if (event.key === "ArrowDown") next += windowRange.columns;
    else next += event.key === "ArrowLeft" || (event.key === "Tab" && event.shiftKey) ? -1 : 1;
    if (next < 0 || next >= items.length) return;
    event.preventDefault();
    const top = 5 + Math.floor(next / windowRange.columns) * windowRange.pitch;
    if (scrollRoot && scrollEl &&
        (top < scrollTop || top + windowRange.cellHeight > scrollTop + viewportHeight)) {
      const regionTop = scrollEl.getBoundingClientRect().top;
      const viewportTop = scrollRoot.getBoundingClientRect().top + headerHeight;
      const availableHeight = scrollRoot.clientHeight - headerHeight;
      scrollRoot.scrollTop += regionTop + top - viewportTop - availableHeight / 2;
      updateViewport(scrollRoot, scrollEl);
    }
    await tick();
    const row = pageEl?.querySelector<HTMLElement>(`[data-bookmark-id="${items[next].id}"]`);
    row?.querySelector<HTMLElement>("a,button,[tabindex='0']")?.focus({ preventScroll: true });
  }

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
    await loadFolderPreviews(renderedItems.map(entry => entry.item));
    pruneSelection();
    await onChanged?.();
    notifyBookmarksUpdated();
  }

  async function loadFolderPreviews(nodes: BookmarkNode[] = items) {
    const requestId = ++folderPreviewRequestId;
    const folders = nodes.filter((node) => !node.url && !(node.id in folderPreviewUrls));
    if (!folders.length) return;
    const entries = await Promise.all(
      folders.map(async (folder) => {
        try {
          const children =
            folder.children ?? (await getBookmarkChildren(folder.id));
          const urls = children
            .flatMap((child) => (child.url ? [child.url] : []))
            .slice(0, 4);
          return [folder.id, urls] as const;
        } catch {
          return [folder.id, []] as const;
        }
      }),
    );
    if (requestId !== folderPreviewRequestId) return;
    folderPreviewUrls = { ...folderPreviewUrls, ...Object.fromEntries(entries) };
  }

  $effect(() => {
    const visible = renderedItems.map(entry => entry.item);
    void loadFolderPreviews(visible);
  });

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
    if (scrollRoot) folderScrollPositions.set(folderId, scrollRoot.scrollTop);
    onclickFolder(bkmk);
  }

  function isShadowItem(item: BookmarkNode) {
    return !!(item as BookmarkNode & Record<string, unknown>)[
      SHADOW_ITEM_MARKER_PROPERTY_NAME
    ];
  }

  function captureBatchDragIcons(ids: string[]) {
    if (!pageEl) return [];
    const itemElements = Array.from(
      pageEl.querySelectorAll<HTMLElement>(".item[data-bookmark-id]"),
    );
    const elementsById = new Map(
      itemElements.map((item) => [item.dataset.bookmarkId ?? "", item]),
    );
    return ids.flatMap((id) => {
      const icon = elementsById
        .get(id)
        ?.querySelector<HTMLElement>(".drag_icon_source");
      return icon ? [icon.cloneNode(true) as HTMLElement] : [];
    });
  }

  function draggedel(
    el: HTMLElement | undefined,
    draggedData?: Record<string, unknown>,
  ) {
    if (!el) return;
    el.style.backgroundColor = "transparent";
    el.style.boxShadow = "none";
    el.style.border = "none";
    el.style.outline = "none";
    el.querySelectorAll<HTMLElement>(
      "a, button, .folder_card, .bkmk_v, .bkmk_h",
    ).forEach((child) => {
      child.style.backgroundColor = "transparent";
      child.style.boxShadow = "none";
      child.style.border = "none";
      child.style.outline = "none";
    });

    const sourceId = String(draggedData?.id ?? "");
    if (!multiSelectMode || !selectedIds.has(sourceId) || selectedIds.size < 2) {
      return;
    }
    const decorationKey = `${sourceId}:${selectedIds.size}`;
    Object.assign(el.style, {
      width: "56px",
      height: "56px",
      minWidth: "56px",
      minHeight: "56px",
      overflow: "visible",
      border: "none",
      outline: "none",
      borderRadius: "0",
      background: "transparent",
      boxShadow: "none",
    });
    if (el.dataset.batchDragDecoration === decorationKey) return;

    const fallbackIcon = el.querySelector<HTMLElement>(".drag_icon_source");
    const iconSources = batchDragIconSnapshots.length
      ? batchDragIconSnapshots
      : fallbackIcon
        ? [fallbackIcon]
        : [];
    el.replaceChildren();
    el.dataset.batchDragDecoration = decorationKey;

    if (iconSources.length) {
      for (let index = iconSources.length - 1; index >= 0; index -= 1) {
        const icon = iconSources[index].cloneNode(true) as HTMLElement;
        const offset = Math.min(index, 6) * 3;
        icon.setAttribute("aria-hidden", "true");
        Object.assign(icon.style, {
          position: "absolute",
          left: "8px",
          top: "8px",
          width: "40px",
          height: "40px",
          minWidth: "40px",
          minHeight: "40px",
          opacity: index === 0 ? "1" : String(Math.max(0.34, 1 - index * 0.14)),
          transform: `translate(${offset}px, ${offset}px)`,
          filter: index === 0 ? "none" : "drop-shadow(0 2px 3px rgba(0, 0, 0, 0.18))",
        });
        const iconContent = icon.firstElementChild as HTMLElement | null;
        if (iconContent) {
          Object.assign(iconContent.style, {
            width: "40px",
            height: "40px",
            minWidth: "40px",
            minHeight: "40px",
          });
        }
        icon.querySelectorAll<HTMLElement>("div, img, svg").forEach((child) => {
          child.style.maxWidth = "100%";
          child.style.maxHeight = "100%";
        });
        el.append(icon);
      }
    }

    const count = document.createElement("div");
    count.textContent = String(selectedIds.size);
    count.setAttribute(
      "aria-label",
      `${t("nt_multi_select")} ${selectedIds.size}`,
    );
    Object.assign(count.style, {
      position: "absolute",
      top: "0",
      right: "-4px",
      zIndex: "20",
      color: "var(--c-text)",
      background: "transparent",
      fontSize: "14px",
      fontWeight: "700",
      lineHeight: "1",
      textShadow: "0 1px 3px var(--c-bg), 0 1px 5px var(--c-bg)",
    });
    el.append(count);
  }

  function handleDragPointerMove(event: PointerEvent) {
    if (virtualized || !sorting || !draggedBookmarkId || combineHover.released) return;
    if (!combineHover.update(findCombineTarget(event.clientX, event.clientY))) return;
    if (combineHover.hoveredId) {
      cancelReorderDelay();
    } else {
      schedulePendingReorder();
    }
  }

  function captureDropTarget(event: MouseEvent | TouchEvent) {
    if (virtualized || !sorting || !draggedBookmarkId || combineHover.released) return;
    const point = "changedTouches" in event ? event.changedTouches[0] : event;
    combineHover.capture(point && findCombineTarget(point.clientX, point.clientY));
    cancelReorderDelay();
  }

  function findCombineTarget(clientX: number, clientY: number) {
    if (!pageEl) return;
    const zones = pageEl.querySelectorAll<HTMLElement>(
      "[data-bookmark-combine-hit-id]",
    );
    for (const zone of zones) {
      const targetId = zone.dataset.bookmarkCombineHitId;
      if (!targetId || targetId === draggedBookmarkId) continue;
      const target = dragStartItems.find((item) => item.id === targetId);
      if (multiSelectMode && (!target || selectedIds.has(targetId))) {
        continue;
      }
      const rect = zone.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return targetId;
      }
    }
  }

  function cancelReorderDelay() {
    if (reorderDelayId === null) return;
    clearTimeout(reorderDelayId);
    reorderDelayId = null;
  }

  function schedulePendingReorder() {
    cancelReorderDelay();
    if (!pendingReorderItems || combineHover.released || combineHover.hoveredId) return;
    reorderDelayId = setTimeout(() => {
      reorderDelayId = null;
      if (
        sorting &&
        draggedBookmarkId &&
        !combineHover.hoveredId &&
        pendingReorderItems
      ) {
        items = pendingReorderItems;
      }
    }, DRAG_HOVER_DELAY_MS);
  }

  function handleConsider(e: CustomEvent<DndEvent<BookmarkNode>>) {
    if (!canSortItems) return;
    const nextItems = e.detail.items;
    if (e.detail.info.trigger === "dragStarted") {
      cancelReorderDelay();
      pendingReorderItems = null;
      pendingReorderSignature = "";
      combineHover.reset();
      draggedBookmarkId = e.detail.info.id;
      dragStartItems = [...items];
      if (multiSelectMode && !selectedIds.has(e.detail.info.id)) {
        const draggedItem = items.find(
          (item) => item.id === e.detail.info.id,
        );
        if (draggedItem && !isProtectedRootFolder(draggedItem)) {
          selectedIds = new Set([draggedItem.id]);
        }
      }
      batchDragIds = multiSelectMode
        ? dragStartItems
            .filter((item) => selectedIds.has(item.id))
            .map((item) => item.id)
        : [];
      batchDragIconSnapshots = captureBatchDragIcons(batchDragIds);
      sorting = true;
      items = batchDragIds.length
        ? nextItems.filter(
            (item) => isShadowItem(item) || !batchDragIds.includes(item.id),
          )
        : nextItems;
      return;
    }

    if (batchDragIds.length) {
      pendingReorderItems = nextItems;
      const nextSignature = nextItems.map((item) => item.id).join("|");
      if (nextSignature !== pendingReorderSignature) {
        pendingReorderSignature = nextSignature;
        schedulePendingReorder();
      }
      return;
    }

    pendingReorderItems = nextItems;
    const nextSignature = nextItems.map((item) => item.id).join("|");
    if (nextSignature !== pendingReorderSignature) {
      pendingReorderSignature = nextSignature;
      schedulePendingReorder();
    }
  }

  async function handleFinalize(e: CustomEvent<DndEvent<BookmarkNode>>) {
    cancelReorderDelay();
    pendingReorderItems = null;
    pendingReorderSignature = "";
    const sourceId = draggedBookmarkId ?? e.detail.info.id;
    const targetId = combineHover.releasedId;
    const activeBatchDragIds = [...batchDragIds];
    const batchDrag = multiSelectMode && activeBatchDragIds.length > 0;
    sorting = false;
    items = e.detail.items;
    draggedBookmarkId = null;
    combineHover.reset();
    batchDragIds = [];
    batchDragIconSnapshots = [];
    if (!canSortItems) return;

    if (batchDrag) {
      const target = dragStartItems.find((item) => item.id === targetId);
      const selected = dragStartItems.filter((item) =>
        activeBatchDragIds.includes(item.id),
      );
      if (target && !activeBatchDragIds.includes(target.id)) {
        await dropBatchOnTarget(selected, target);
        return;
      }

      if (e.detail.info.trigger === "droppedOutsideOfAny") {
        items = dragStartItems;
        return;
      }

      const compactItems = e.detail.items.filter((item) => !isShadowItem(item));
      const insertionIndex = Math.max(
        0,
        compactItems.findIndex((item) => item.id === sourceId),
      );
      const remainingItems = compactItems.filter(
        (item) => !activeBatchDragIds.includes(item.id),
      );
      const reorderedItems = [
        ...remainingItems.slice(0, insertionIndex),
        ...selected,
        ...remainingItems.slice(insertionIndex),
      ];
      items = reorderedItems;
      await persistBookmarkOrder(reorderedItems);
      await refreshCurrentFolder();
      return;
    }

    if (targetId && targetId !== sourceId) {
      const source = dragStartItems.find((item) => item.id === sourceId);
      const target = dragStartItems.find((item) => item.id === targetId);
      if (source && target) {
        if (target.url) {
          const targetIndex = dragStartItems.findIndex(
            (item) => item.id === target.id,
          );
          const folder = await createBookmark({
            parentId: bookmarkNode.id,
            index: Math.max(0, targetIndex),
            title: t("nt_new_bookmark_folder"),
          });
          await moveBookmark(target.id, { parentId: folder.id, index: 0 });
          await moveBookmark(source.id, { parentId: folder.id, index: 1 });
        } else {
          await moveBookmark(source.id, { parentId: target.id });
        }
        await refreshCurrentFolder();
        return;
      }
    }

    await persistBookmarkOrder(items);
    await refreshCurrentFolder();
  }

  async function persistBookmarkOrder(orderedItems: BookmarkNode[]) {
    for (const [index, item] of orderedItems.entries()) {
      await moveBookmark(item.id, { parentId: bookmarkNode.id, index });
    }
  }

  async function dropBatchOnTarget(
    selected: BookmarkNode[],
    target: BookmarkNode,
  ) {
    if (!selected.length || isProtectedRootFolder(target)) {
      items = dragStartItems;
      return;
    }

    batchActionLoading = true;
    batchErrorMessage = "";
    let failedCount = 0;
    try {
      let destinationId = target.id;
      let nextIndex = 0;
      if (target.url) {
        const targetIndex = Math.max(
          0,
          dragStartItems.findIndex((item) => item.id === target.id),
        );
        const folder = await createBookmark({
          parentId: bookmarkNode.id,
          index: targetIndex,
          title: t("nt_new_bookmark_folder"),
        });
        destinationId = folder.id;
        await moveBookmark(target.id, { parentId: destinationId, index: 0 });
        nextIndex = 1;
      } else {
        nextIndex = (await getBookmarkChildren(target.id)).length;
      }

      for (const item of selected) {
        try {
          await moveBookmark(item.id, {
            parentId: destinationId,
            index: nextIndex,
          });
          nextIndex += 1;
        } catch {
          failedCount += 1;
        }
      }
      await refreshCurrentFolder();
      if (failedCount) {
        batchErrorMessage = t(
          "nt_batch_bookmarks_action_failed",
          String(failedCount),
        );
      } else {
        deselectAll();
      }
    } catch {
      failedCount = Math.max(failedCount, selected.length);
      await refreshCurrentFolder();
      batchErrorMessage = t(
        "nt_batch_bookmarks_action_failed",
        String(failedCount),
      );
    } finally {
      batchActionLoading = false;
    }
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
    event.stopPropagation();
    clickFolder(bkmk);
  }

  function openBookmarkByKeyboard(event: KeyboardEvent) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLAnchorElement).click();
  }

  function disableKeyboardDnd(node: HTMLElement) {
    const handleKeydown = (event: KeyboardEvent) => {
      if (
        multiSelectMode ||
        event.repeat ||
        (event.key !== "Enter" && event.key !== " ")
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const item = target.closest<HTMLElement>(".item");
      if (!item || item.parentElement !== node) return;

      const bookmarkId = item.dataset.bookmarkId;
      const bookmark = items.find((entry) => entry.id === bookmarkId);
      if (!bookmark) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (bookmark.url) {
        item.querySelector<HTMLAnchorElement>("a[href]")?.click();
      } else {
        clickFolder(bookmark);
      }
    };

    node.addEventListener("keydown", handleKeydown, true);
    return {
      destroy() {
        node.removeEventListener("keydown", handleKeydown, true);
      },
    };
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

  async function clickCreateBookmark(nextValue: {
    title: string;
    url?: string;
  }) {
    await createBookmark({
      parentId: bookmarkNode.id,
      title: nextValue.title,
      url: nextValue.url,
    });
    await refreshCurrentFolder();
    showAddBookmark = false;
  }

  async function clickDeleteBookmark() {
    if (!currentBkmk) return false;
    if (isProtectedRootFolder(currentBkmk)) return false;
    const bookmarkId = currentBkmk.id;
    showMenu = false;
    const description = currentBkmk.url
      ? t("nt_delete_bookmark_confirm")
      : t("nt_delete_bookmark_folder_confirm");
    const title = currentBkmk.url
      ? t("nt_confirm_delete_bookmark_title")
      : t("nt_confirm_delete_bookmark_folder_title");
    if (!(await requestConfirm(title, description, t("nt_delete"))))
      return false;
    await deleteBookmark(bookmarkId);
    await refreshCurrentFolder();
    showEdit = false;
    currentBkmk = undefined;
    return true;
  }

  async function dissolveFolder(folder: BookmarkNode) {
    if (folder.url || isProtectedRootFolder(folder)) return;
    showMenu = false;
    const children = await getBookmarkChildren(folder.id);
    const folderIndex = Math.max(
      0,
      items.findIndex((item) => item.id === folder.id),
    );
    for (const [index, child] of children.entries()) {
      await moveBookmark(child.id, {
        parentId: bookmarkNode.id,
        index: folderIndex + index,
      });
    }
    await deleteBookmark(folder.id);
    currentBkmk = undefined;
    await refreshCurrentFolder();
  }

  function findNodeById(
    node: BookmarkNode | null,
    id: string,
  ): BookmarkNode | null {
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
    selectedBtn?.focus({ preventScroll: true });
  }

  function deselectAll() {
    selectedIds = new Set();
    lastClickedIndex = -1;
  }

  function exitMultiSelect() {
    if (batchActionLoading) return;
    multiSelectMode = false;
    deselectAll();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== "Escape") return;
    if (settingsOpen) return;

    if (
      showEdit ||
      showAddBookmark ||
      showMove ||
      showBatchMove ||
      confirmOptions
    )
      return;
    if (sorting || batchActionLoading) return;

    if (showMenu) {
      e.preventDefault();
      showMenu = false;
      return;
    }

    if (multiSelectMode) {
      e.preventDefault();
      exitMultiSelect();
      return;
    }

    e.preventDefault();
    onback?.();
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointermove", handleDragPointerMove);
    window.addEventListener("mouseup", captureDropTarget, true);
    window.addEventListener("touchend", captureDropTarget, true);
  });

  onDestroy(() => {
    if (folderScrollPositions.size > 100) folderScrollPositions.delete(folderScrollPositions.keys().next().value!);
    folderPreviewRequestId += 1;
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("pointermove", handleDragPointerMove);
    window.removeEventListener("mouseup", captureDropTarget, true);
    window.removeEventListener("touchend", captureDropTarget, true);
    combineHover.reset();
    cancelReorderDelay();
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
      deselectAll();
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
      items.filter((b) => selectedIds.has(b.id) && !b.url).map((b) => b.id),
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
      deselectAll();
    } finally {
      batchActionLoading = false;
    }
  }

  function pruneSelection() {
    const validIds = new Set(
      items
        .filter((bkmk) => !isProtectedRootFolder(bkmk))
        .map((bkmk) => bkmk.id),
    );
    const nextIds = [...selectedIds].filter((id) => validIds.has(id));
    if (nextIds.length !== selectedIds.size) {
      selectedIds = new Set(nextIds);
      if (!nextIds.length) lastClickedIndex = -1;
    }
  }
</script>

<div class="page" bind:this={pageEl}>
  <div
    class="bookmark_scroll"
    role="region"
    aria-label={t("nt_tab_bookmarks")}
    tabindex="-1"
    bind:this={scrollEl}
    use:trackViewport={scrollRoot}
    use:virtualKeyboardEvents
    class:multi_select_frame={multiSelectMode}
  >
    {#if items.length}
      <div
        class="content {list ? 'list' : 'grid'} {sorting
          ? 'sorting'
          : ''} {multiSelectMode ? 'multi_select' : ''}"
        use:disableKeyboardDnd
        role="list"
        class:virtual={virtualized}
        style:height={virtualized ? `${windowRange.height}px` : undefined}
        ondragover={nativeDragOver}
        ondrop={nativeDrop}
        use:bookmarkDnd={canSortItems
          ? {
              items,
              flipDurationMs: 200,
              type: `bookmark-${bookmarkNode.id}`,
              dropTargetStyle: {},
              zoneTabIndex: -1,
              zoneItemTabIndex: -1,
              autoAriaDisabled: true,
              morphDisabled: multiSelectMode,
              dropAnimationDisabled: multiSelectMode,
              transformDraggedElement: (e, data) => draggedel(e, data),
              dragDisabled: batchActionLoading,
              dropFromOthersDisabled: multiSelectMode,
            }
          : {
              items,
              flipDurationMs: 200,
              type: `bookmark-${bookmarkNode.id}`,
              dropTargetStyle: {},
              zoneTabIndex: -1,
              zoneItemTabIndex: -1,
              autoAriaDisabled: true,
              transformDraggedElement: (e) => draggedel(e),
              dragDisabled: true,
              dropFromOthersDisabled: true,
            }}
        onconsider={handleConsider}
        onfinalize={handleFinalize}
      >
        {#each renderedItems as { item: bkmk, index: i } (bkmk.id)}
          <div
            class="item"
            role="listitem"
            data-bookmark-id={bkmk.id}
            style={virtualItemStyle(i)}
            draggable={virtualized && canSortItems && !batchActionLoading && !isProtectedRootFolder(bkmk)}
            ondragstart={(event) => nativeDragStart(event, bkmk)}
            ondragend={nativeDragEnd}
            animate:flip={{ duration: virtualized ? 0 : 200 }}
          >
            <div
              class="combine_hit_zone"
              data-bookmark-combine-hit-id={bkmk.id}
              aria-hidden="true"
            ></div>
            {#if sorting && bkmk.id !== draggedBookmarkId && dragStartItems.some((item) => item.id === bkmk.id) && (!multiSelectMode || (!selectedIds.has(bkmk.id) && !isProtectedRootFolder(bkmk)))}
              <div
                class="combine_drop_zone"
                class:combine_target={combineTargetId === bkmk.id}
                aria-hidden="true"
              ></div>
            {/if}
            {@render tembkmkWrapper(bkmk, i)}
          </div>
        {/each}
      </div>
    {:else}
      <div class="content {list ? 'list' : 'grid'} empty_content">
        <NoData iconName="Bookmark" title={t("nt_no_bookmarks")} />
      </div>
    {/if}
    {#if items.length || multiSelectMode}
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
          onclose={exitMultiSelect}
        />
      </div>
    {/if}
  </div>
</div>

{#snippet temText(list: boolean, text: string)}
  {@const hasText = !!text}
  {@const value = hasText ? text : "--"}
  {@const color = hasText ? undefined : "var(--c-text-2)"}

  {#if list}
    <G full align="c">
      <T nowrap type="m" {color}>{value}</T>
    </G>
  {:else}
    <T nowrap align="c" type="s" {color}>{value}</T>
  {/if}
{/snippet}

{#snippet tembkmkWrapper(bkmk: BookmarkNode, i: number)}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class={list ? "bkmk_h" : "bkmk_v"}
    class:selected={multiSelectMode && list && isSelected(bkmk)}
    onclick={multiSelectMode && !isProtectedRootFolder(bkmk) && list
      ? (e) => handleItemClick(e, bkmk, i)
      : undefined}
    role={multiSelectMode && list ? "button" : undefined}
    tabindex={multiSelectMode && list ? 0 : undefined}
    onkeydown={multiSelectMode && !isProtectedRootFolder(bkmk) && list
      ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            toggleSelect(bkmk);
          }
        }
      : undefined}
  >
    {#if multiSelectMode && !isProtectedRootFolder(bkmk)}
      {#if list}
        <G align="c">
          <div class="drag_icon_source">
            {#if bkmk.url}
              <BkmkIcon imgUrl={bkmk.url} alt={bkmk.title} size="s" />
            {:else}
              <BkmkIcon imgUrl={bkmk.url} alt={bkmk.title} size="s" folderIcon />
            {/if}
          </div>
        </G>
        <G full align="c">
          <T nowrap type="m">{bkmk.title}</T>
        </G>
      {:else}
        <Button
          onclick={(e) => handleItemClick(e, bkmk, i)}
          sel={isSelected(bkmk)}
          outlined={!isSelected(bkmk)}
          r="r1"
        >
          <G>
            <div class="drag_icon_source">
              {#if bkmk.url}
                <BkmkIcon imgUrl={bkmk.url} alt={bkmk.title} size="l" />
              {:else}
                <BookmarkFolderIcon
                  previewUrls={folderPreviewUrls[bkmk.id] ?? []}
                  size="l"
                />
              {/if}
            </div>
          </G>
        </Button>
        <T nowrap align="c" type="s">{bkmk.title}</T>
      {/if}
    {:else if list}
      {#if bkmk.url}
        <a
          href={bkmk.url}
          target={newTabOpen ? "_blank" : "_self"}
          rel={newTabOpen ? "noreferrer" : undefined}
          class="full-row"
          class:ctx={showMenu && currentBkmk === bkmk}
          onkeydown={openBookmarkByKeyboard}
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
            <Icon name="ChevronRight" color="var(--c-text-1)" opacity={0.6} />
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
          onkeydown={openBookmarkByKeyboard}
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
          <BookmarkFolderIcon previewUrls={folderPreviewUrls[bkmk.id] ?? []} />
        </div>
      {/if}
      {@render temText(false, bkmk.title)}
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
      {#if !currentBkmk.url}
        <Button full onclick={() => void dissolveFolder(currentBkmk!)}>
          <G>
            <T>{t("nt_dissolve_bookmark_folder")}</T>
          </G>
        </Button>
      {/if}
      <Button full onclick={() => void clickDeleteBookmark()}>
        <G>
          <T color="var(--c-red)">{t("nt_delete")}</T>
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

{#if showAddBookmark}
  <AddBookmark
    onSave={clickCreateBookmark}
    onclickClose={() => (showAddBookmark = false)}
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
    flex: 1 0 auto;
    width: 100%;
    align-items: center;
    position: relative;
  }

  .bookmark_scroll {
    display: flex;
    flex-direction: column;
    flex: 1 0 auto;
    width: 100%;
    box-sizing: border-box;
    border-radius: var(--r1);
    padding-bottom: calc(var(--gap) * 2);
  }

  .bookmark_scroll.multi_select_frame {
    box-shadow: inset 0 0 0 2px var(--c-main-3);
  }

  :global(#dnd-action-dragged-el[data-bookmark-id]),
  :global(#dnd-action-dragged-el[data-bookmark-id]:focus),
  :global(#dnd-action-dragged-el[data-bookmark-id]:focus-visible),
  :global([data-is-dnd-shadow-item-internal="true"][data-bookmark-id]) {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
  }
  :global(#dnd-action-dragged-el[data-bookmark-id] *) {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
  }

  .multi_select {
    position: relative;
    user-select: none;
  }

  .batch_bar_container {
    position: sticky;
    bottom: 20px;
    margin-top: auto;
    margin-inline: auto;
    height: 0;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    width: min(400px, calc(100% - var(--gap) * 4));
    box-sizing: border-box;
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
    position: relative;
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
    cursor: default !important;
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
    cursor: default !important;
  }
  .drag_icon_source {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .content {
    flex: none;
    gap: var(--gap);
    margin-bottom: calc(90px - var(--gap) * 2);
    padding: var(--gap);
    width: 100%;
    box-sizing: border-box;
    border-radius: var(--r1);
  }
  .content.virtual {
    display: block;
    position: relative;
  }
  .content.sorting {
    outline: 2px dashed var(--c-mask);
    outline-offset: -2px;
  }
  .combine_hit_zone {
    position: absolute;
    top: calc(var(--gap) * 2);
    left: 50%;
    width: calc(40px + var(--gap) * 2);
    height: calc(40px + var(--gap) * 2);
    transform: translateX(-50%);
    visibility: hidden;
    pointer-events: none;
  }
  .combine_drop_zone {
    position: absolute;
    top: calc(var(--gap) * 2);
    left: 50%;
    z-index: 6;
    display: flex;
    align-items: center;
    justify-content: center;
    width: calc(40px + var(--gap) * 2);
    height: calc(40px + var(--gap) * 2);
    box-sizing: border-box;
    border: none;
    border-radius: var(--r1);
    outline: 2px var(--c-mask) solid;
    opacity: 0.72;
    transform: translateX(-50%) scale(1);
    transition:
      opacity 120ms ease,
      transform 120ms ease,
      outline-offset 120ms ease,
      background-color 120ms ease;
    pointer-events: none;
  }
  .combine_drop_zone.combine_target {
    outline-offset: 4px;
    outline-color: var(--c-main);
    opacity: 1;
    transform: translateX(-50%) scale(1.08);
    background-color: var(--c-main-3);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    align-content: start;
  }
  .list {
    display: flex;
    flex-direction: column;
  }
  .list .item {
    padding: 0;
  }
  .list .combine_drop_zone {
    top: 50%;
    left: calc(var(--gap) * 2 + 10px);
    width: 36px;
    height: 36px;
    transform: translate(-50%, -50%) scale(1);
  }
  .list .combine_hit_zone {
    top: 50%;
    left: calc(var(--gap) * 2 + 10px);
    width: 36px;
    height: 36px;
    transform: translate(-50%, -50%);
  }
  .list .combine_drop_zone.combine_target {
    transform: translate(-50%, -50%) scale(1.08);
  }
  .list.multi_select .bkmk_h {
    padding: var(--gap);
    gap: 0;
    outline: 2px solid var(--c-mask);
  }
  .list.multi_select .bkmk_h.selected {
    outline: 2px solid var(--c-main);
  }

  a {
    text-decoration: none;
    cursor: default;
    width: auto;
    height: auto;
    margin: 0;
    border-radius: var(--r1);
    -webkit-user-drag: none;
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
  .grid .folder_card {
    outline: 2px var(--c-mask) solid;
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
  .empty_content {
    align-content: start;
  }
  .grid.empty_content {
    display: flex;
    justify-content: center;
  }
</style>
