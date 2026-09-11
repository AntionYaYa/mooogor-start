<script lang="ts">
  import BkmkIcon from "./BkmkIcon.svelte";
  import WebsiteTile from "./WebsiteTile.svelte";
  import WebsiteFolderTile from "./WebsiteFolderTile.svelte";
  import T from "./components/T.svelte";
  import G from "./components/G.svelte";
  import { flip } from "svelte/animate";
  import { dndzone, SHADOW_ITEM_MARKER_PROPERTY_NAME } from "svelte-dnd-action";
  import { combineRootWebSites } from "./DB/websiteFolders";
  import CommonGroupMenu from "./CommonGroupMenu.svelte";
  import type { DndEvent } from "svelte-dnd-action";
  import {
    addWebSite,
    updateWebSite,
    deleteWebSite,
    updateWebSiteScreenshot,
    removeWebSiteScreenshot,
    getWebSiteScreenshot,
    addWebSiteFolder,
    updatePinnedItemsOrder,
    updateWebSitesOrder,
    moveWebSitesToFolder,
  } from "@/lib/DB/DB";
  import type { WebSite, WebSiteFolder } from "@/lib/DB/DB";
  import type { FrequentSite } from "@/lib/browser/history";
  import { addToPinneds } from "@/lib/utils/pinneds";
  import Button from "./components/Button.svelte";
  import AddPinned from "./AddPinned.svelte";
  import MoveCommonSites from "./MoveCommonSites.svelte";
  import LinkContextMenu from "./LinkContextMenu.svelte";
  import NoData from "./NoData.svelte";
  import { t } from "@/lib/utils/i18n";
  import Icon from "./components/Icon.svelte";
  import Popup from "./components/Popup.svelte";
  import Divider from "./components/Divider.svelte";
  import ConfirmDialog from "./ConfirmDialog.svelte";
  import { onMount, onDestroy } from "svelte";

  interface Props {
    allPinneds: WebSite[] | [];
    webSiteFolders?: WebSiteFolder[];
    frequentSites?: FrequentSite[];
    newTabOpen?: boolean;
    list?: boolean;
    showAdd: boolean;
    loading?: boolean;
    error?: boolean;
    readOnly?: boolean;
    onReset?: () => void | Promise<void>;
    onopenAdd: () => void;
    oncloseAdd: () => void;
    onUpdate: (items?: WebSite[]) => void;
    onToggleList: () => void;
    currentFolder?: WebSiteFolder;
  }

  let {
    allPinneds,
    webSiteFolders = [],
    frequentSites = [],
    newTabOpen = false,
    list = false,
    showAdd,
    loading = false,
    error = false,
    readOnly = false,
    onReset = () => {},
    onopenAdd,
    oncloseAdd,
    onUpdate,
    onToggleList,
    currentFolder = $bindable(),
  }: Props = $props();
  let isdarging = $state(false);
  let currentPinned: WebSite | undefined = $state();
  let currentFrequent: FrequentSite | undefined = $state();
  let openByEdit = $state(false);

  let menuX = $state(0);
  let menuY = $state(0);

  let showPinnedMenu = $state(false);
  let movingSite: WebSite | undefined = $state();

  function openMoveSite() {
    if (readOnly || currentPinned?.id == null) return;
    movingSite = currentPinned;
    showPinnedMenu = false;
  }

  async function moveSite(folderId?: number) {
    if (readOnly || movingSite?.id == null) return;
    await moveWebSitesToFolder([movingSite.id], folderId);
    await onUpdate();
  }
  let groupMenu: WebSiteFolder | undefined = $state();
  let showFrequentMenu = $state(false);
  let showFrequentInfo = $state(false);
  let combineTargetId: string | undefined = $state();
  let releasedTargetId: string | undefined;
  let dragStartItems: PinnedGridItem[] = [];
  let pendingReorderItems: PinnedGridItem[] | undefined;
  let pendingReorderSignature = "";
  let reorderTimer: ReturnType<typeof setTimeout> | undefined;
  const REORDER_HOVER_DELAY_MS = 280;
  let draggedGridItemId: string | undefined = $state();
  let capturingWebsiteId: number | undefined = $state();
  let currentPinnedHasScreenshot = $state(false);
  let pageEl: HTMLElement | undefined = $state();
  let frequentTitleStuck = $state(false);
  let confirmOptions = $state<{
    title: string;
    description: string;
    confirmText?: string;
    resolve: (value: boolean) => void;
  } | null>(null);
  const skeletonItems = Array.from({ length: 6 });

  const folderIds = $derived(new Set(webSiteFolders.flatMap((folder) =>
    folder.id == null ? [] : [folder.id],
  )));
  const rootPinneds = $derived(
    allPinneds.filter((site) => site.folderId == null || !folderIds.has(site.folderId)),
  );

  type PinnedGridItem =
    | { id: string; kind: "website"; order: number; website: WebSite }
    | { id: string; kind: "folder"; order: number; folder: WebSiteFolder };
  let pinnedGridItems: PinnedGridItem[] = $state([]);

  $effect(() => {
    const activeFolder = currentFolder?.id == null
      ? undefined
      : webSiteFolders.find((folder) => folder.id === currentFolder?.id);
    if (currentFolder && !activeFolder) currentFolder = undefined;
    pinnedGridItems = activeFolder ? sitesInFolder(activeFolder).map((website, index) => ({
      id: `website:${website.id ?? website.url}`,
      kind: "website" as const,
      order: website.order ?? index,
      website,
    })) : [
      ...rootPinneds.map((website, index) => ({
        id: `website:${website.id ?? website.url}`,
        kind: "website" as const,
        order: website.order ?? index,
        website,
      })),
      ...webSiteFolders.map((folder, index) => ({
        id: `folder:${folder.id ?? folder.title}`,
        kind: "folder" as const,
        order: folder.order ?? rootPinneds.length + index,
        folder,
      })),
    ].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  });

  function sitesInFolder(folder: WebSiteFolder) {
    return folder.id == null
      ? []
      : allPinneds
          .filter((site) => site.folderId === folder.id)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  const fixedDomains = $derived.by(() => {
    return new Set(
      allPinneds.map((pinned) => pinned.domain.replace(/^www\./, "")),
    );
  });
  const filteredFrequentSites = $derived.by(() => {
    return frequentSites.filter((site) => !fixedDomains.has(site.domain));
  });

  function showContextMenu(e: MouseEvent, pinned: WebSite) {
    if (readOnly) return;
    groupMenu = undefined;
    e.preventDefault();
    e.stopPropagation();

    currentPinned = pinned;
    currentFrequent = undefined;
    menuX = e.clientX;
    menuY = e.clientY;
    showFrequentMenu = false;
    showPinnedMenu = true;
    currentPinnedHasScreenshot = false;
    if (pinned.id != null) {
      void getWebSiteScreenshot(pinned.id, pinned.url).then((screenshot) => {
        if (showPinnedMenu && currentPinned?.id === pinned.id) {
          currentPinnedHasScreenshot = !!screenshot;
        }
      }).catch(() => undefined);
    }
  }

  function showFrequentContextMenu(e: MouseEvent, site: FrequentSite) {
    if (readOnly) return;
    groupMenu = undefined;
    e.preventDefault();
    e.stopPropagation();

    currentPinned = undefined;
    currentFrequent = site;
    menuX = e.clientX;
    menuY = e.clientY;
    showPinnedMenu = false;
    showFrequentMenu = true;
  }

  function requestConfirm(title: string, description: string, confirmText?: string) {
    return new Promise<boolean>((resolve) => {
      confirmOptions = { title, description, confirmText, resolve };
    });
  }

  function showGroupMenu(event: MouseEvent, group: WebSiteFolder) {
    if (readOnly) return;
    event.preventDefault();
    event.stopPropagation();
    showPinnedMenu = showFrequentMenu = false;
    menuX = event.clientX;
    menuY = event.clientY;
    groupMenu = group;
  }

  async function resetWebsitesAfterFailure() {
    if (
      !(await requestConfirm(
        t("nt_confirm_reset_common_sites_title"),
        t("nt_settings_common_reset_confirm"),
        t("nt_confirm"),
      ))
    ) {
      return;
    }
    await onReset();
  }

  function closeConfirm(result: boolean) {
    confirmOptions?.resolve(result);
    confirmOptions = null;
  }


  function handleConsider(e: CustomEvent<DndEvent<PinnedGridItem>>) {
    if (readOnly) return;
    if (e.detail.info.trigger === "dragStarted") {
      clearDragState();
      dragStartItems = [...pinnedGridItems];
      isdarging = true;
      draggedGridItemId = String(e.detail.info.id);
      pinnedGridItems = e.detail.items;
      return;
    }
    if (currentFolder || dragStartItems.find((item) => item.id === draggedGridItemId)?.kind !== "website") {
      pinnedGridItems = e.detail.items;
      return;
    }
    pendingReorderItems = e.detail.items;
    const signature = e.detail.items.map((item) => item.id).join("|");
    if (signature !== pendingReorderSignature) {
      pendingReorderSignature = signature;
      scheduleReorder();
    }
  }

  function cancelReorder() {
    clearTimeout(reorderTimer);
    reorderTimer = undefined;
  }

  function scheduleReorder() {
    cancelReorder();
    if (combineTargetId || !pendingReorderItems) return;
    reorderTimer = setTimeout(() => {
      reorderTimer = undefined;
      if (isdarging && !combineTargetId && pendingReorderItems) {
        pinnedGridItems = pendingReorderItems;
      }
    }, REORDER_HOVER_DELAY_MS);
  }

  function clearDragState() {
    cancelReorder();
    pendingReorderItems = undefined;
    pendingReorderSignature = "";
    combineTargetId = releasedTargetId = undefined;
    draggedGridItemId = undefined;
    isdarging = false;
  }

  async function handleFinalize(e: CustomEvent<DndEvent<PinnedGridItem>>) {
    const draggedItem = dragStartItems.find((item) => item.id === draggedGridItemId);
    const targetItem = dragStartItems.find((item) => item.id === (releasedTargetId ?? combineTargetId));
    clearDragState();
    if (readOnly) return;
    pinnedGridItems = e.detail.items;
    if (!currentFolder && targetItem && draggedItem?.kind === "website" && draggedItem.website.id != null) {
      try {
        if (targetItem.kind === "folder" && targetItem.folder.id != null) {
          await moveWebSitesToFolder([draggedItem.website.id], targetItem.folder.id);
        } else if (targetItem.kind === "website" && targetItem.website.id != null) {
          await combineRootWebSites(draggedItem.website.id, targetItem.website.id, t("nt_folder"));
        }
      } finally {
        await onUpdate();
      }
      return;
    }
    if (currentFolder) {
      const websites = pinnedGridItems.flatMap((item) =>
        item.kind === "website" && item.website.id != null
          ? [{ ...item.website, id: item.website.id }]
          : [],
      );
      if (websites.length) await updateWebSitesOrder(websites);
      await onUpdate();
      return;
    }
    const orderItems = pinnedGridItems.flatMap((item) => {
      const id = item.kind === "website" ? item.website.id : item.folder.id;
      return id == null ? [] : [{ kind: item.kind, id }];
    });
    if (orderItems.length) await updatePinnedItemsOrder(orderItems);
    await onUpdate();
  }

  function trackFolderDrop(event: PointerEvent) {
    if (!isdarging || currentFolder || !pageEl ||
        dragStartItems.find((item) => item.id === draggedGridItemId)?.kind !== "website") return;
    let targetId: string | undefined;
    for (const zone of pageEl.querySelectorAll<HTMLElement>("[data-combine-id]")) {
      const rect = zone.getBoundingClientRect();
      if (event.clientX >= rect.left && event.clientX <= rect.right &&
          event.clientY >= rect.top && event.clientY <= rect.bottom) {
        targetId = zone.dataset.combineId;
        break;
      }
    }
    const previous = combineTargetId;
    combineTargetId = targetId;
    if (targetId) cancelReorder();
    else if (previous) scheduleReorder();
  }

  function captureDropTarget(event: PointerEvent) {
    trackFolderDrop(event);
    releasedTargetId = combineTargetId;
    cancelReorder();
  }

  function canCombineWith(item: PinnedGridItem) {
    return isdarging && !currentFolder && item.id !== draggedGridItemId &&
      !(item as PinnedGridItem & Record<string, unknown>)[SHADOW_ITEM_MARKER_PROPERTY_NAME] &&
      dragStartItems.some((entry) => entry.id === item.id) &&
      dragStartItems.find((entry) => entry.id === draggedGridItemId)?.kind === "website";
  }

  async function clickSaveWebSite(newWebSite: WebSite) {
    if (openByEdit && currentPinned?.id) {
      await updateWebSite({ ...newWebSite, id: currentPinned.id });
    } else {
      await addWebSite(newWebSite);
    }
    onUpdate();
  }

  async function clickSaveFolder(title: string) {
    await addWebSiteFolder({ title });
    await onUpdate();
  }

  function clickEditWebSite() {
    openByEdit = true;
    showPinnedMenu = false;
    onopenAdd();
  }

  function clickCloseAdd() {
    openByEdit = false;
    currentPinned = undefined;
    oncloseAdd();
  }
  async function clickDeleteWebSite() {
    if (!currentPinned?.id) return false;
    if (
      !(await requestConfirm(
        t("nt_confirm_delete_common_sites_title"),
        t("nt_settings_common_delete_sites_confirm", "1"),
      ))
    ) {
      return false;
    }
    await deleteWebSite(currentPinned.id);
    onUpdate();
    showPinnedMenu = false;
    return true;
  }

  async function clickAddFrequentToPinned() {
    showFrequentMenu = false;
    if (!currentFrequent) return;
    await addToPinneds(currentFrequent.url, currentFrequent.title);
    currentFrequent = undefined;
    onUpdate();
  }

  onMount(() => {
    window.addEventListener("pointermove", trackFolderDrop, { passive: true });
    window.addEventListener("pointerup", captureDropTarget, true);
    window.addEventListener("pointercancel", clearDragState);
  });

  onDestroy(() => {
    window.removeEventListener("pointermove", trackFolderDrop);
    window.removeEventListener("pointerup", captureDropTarget, true);
    window.removeEventListener("pointercancel", clearDragState);
    cancelReorder();
  });

  function resizeScreenshot(source: string) {
    return new Promise<string>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const targetWidth = Math.min(480, image.naturalWidth);
        const targetHeight = Math.max(
          1,
          Math.round(targetWidth * 10 / 16),
        );
        const sourceRatio = image.naturalWidth / image.naturalHeight;
        const targetRatio = 16 / 10;
        const sourceWidth = sourceRatio > targetRatio
          ? image.naturalHeight * targetRatio
          : image.naturalWidth;
        const sourceHeight = sourceRatio > targetRatio
          ? image.naturalHeight
          : image.naturalWidth / targetRatio;
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Canvas is unavailable"));
          return;
        }
        context.drawImage(
          image,
          (image.naturalWidth - sourceWidth) / 2,
          (image.naturalHeight - sourceHeight) / 2,
          sourceWidth,
          sourceHeight,
          0,
          0,
          targetWidth,
          targetHeight,
        );
        resolve(canvas.toDataURL("image/jpeg", 0.76));
      };
      image.onerror = () => reject(new Error("Screenshot could not be decoded"));
      image.src = source;
    });
  }

  async function clickCaptureScreenshot() {
    const site = currentPinned;
    if (!site?.id || capturingWebsiteId != null) return;
    showPinnedMenu = false;
    capturingWebsiteId = site.id;
    try {
      // captureVisibleTab runs against a newly created tab. activeTab only grants
      // the original active tab, so this feature needs an explicit optional host grant.
      const granted = await browser.permissions.request({ origins: ["<all_urls>"] });
      if (!granted) return;
      const response = await browser.runtime.sendMessage({
        type: "captureWebSiteScreenshot",
        payload: { websiteId: site.id, url: site.url },
      }) as { ok?: boolean; screenshot?: string; error?: string };
      if (!response?.ok || !response.screenshot) {
        throw new Error(response?.error || "Screenshot failed");
      }
      const screenshot = await resizeScreenshot(response.screenshot);
      await updateWebSiteScreenshot(site.id, screenshot);
      await onUpdate();
    } catch (error) {
      console.error("[Mooogor Screenshot]", error);
    } finally {
      capturingWebsiteId = undefined;
    }
  }

  async function clickRemoveScreenshot() {
    const site = currentPinned;
    if (!site?.id) return;
    showPinnedMenu = false;
    await removeWebSiteScreenshot(site.id);
    currentPinnedHasScreenshot = false;
    await onUpdate();
  }

  function trackStickyFrequentTitle(node: HTMLElement) {
    const scrollContainer = node.closest(".tabs_contents");
    const root =
      scrollContainer instanceof HTMLElement ? scrollContainer : window;
    let frame = 0;

    const updateStuckState = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const sentinel = node.previousElementSibling;
        if (!(sentinel instanceof HTMLElement)) {
          frequentTitleStuck = false;
          return;
        }
        const stickyTop = Number.parseFloat(getComputedStyle(node).top) || 0;
        const rootTop =
          scrollContainer instanceof HTMLElement
            ? scrollContainer.getBoundingClientRect().top
            : 0;
        const scrollTop =
          scrollContainer instanceof HTMLElement
            ? scrollContainer.scrollTop
            : window.scrollY;
        const titleNormalTop =
          sentinel.getBoundingClientRect().bottom - rootTop + scrollTop;
        frequentTitleStuck = scrollTop > titleNormalTop - stickyTop + 0.5;
      });
    };

    root.addEventListener("scroll", updateStuckState, { passive: true });
    window.addEventListener("resize", updateStuckState);
    updateStuckState();

    return {
      destroy() {
        cancelAnimationFrame(frame);
        root.removeEventListener("scroll", updateStuckState);
        window.removeEventListener("resize", updateStuckState);
        frequentTitleStuck = false;
      },
    };
  }
</script>

<div class="page" bind:this={pageEl}>
  {#if loading}
    <section class="section" role="status" aria-label="Loading websites">
      <div class="content grid skeleton_grid" aria-hidden="true">
        {#each skeletonItems as _}
          <div class="skeleton_item">
            <div class="skeleton_icon skeleton_shimmer"></div>
            <div class="skeleton_text skeleton_shimmer"></div>
          </div>
        {/each}
      </div>
    </section>
  {:else if error}
    <section class="error_state" role="alert">
      <Icon name="Info" color="var(--c-text)" opacity={0.6} size={32} />
      <G vertical align="c">
        <T align="c" type="l" bold>{t("nt_websites_load_failed")}</T>
        <T align="c" type="s">{t("nt_websites_load_failed_desc")}</T>
      </G>
      <Button onclick={() => void resetWebsitesAfterFailure()} bg="var(--c-text)">
        <G align="c">
          <Icon name="RotateCcw" color="var(--c-bg)" size={16} />
          <T color="var(--c-bg)">{t("nt_confirm_reset_common_sites_title")}</T>
        </G>
      </Button>
    </section>
  {:else if allPinneds.length || webSiteFolders.length || currentFolder}
    <section class="section padding_section">
      {#if pinnedGridItems.length}
      <div
        class="content grid pinned_grid {isdarging ? 'drag' : ''}"
        use:dndzone={{
          items: pinnedGridItems,
          flipDurationMs: 200,
          type: "pinneds",
          dropTargetStyle: {},
          zoneTabIndex: -1,
          zoneItemTabIndex: -1,
          dragDisabled: readOnly,
          dropFromOthersDisabled: readOnly,
        }}
        onconsider={handleConsider}
        onfinalize={handleFinalize}
      >
        {#each pinnedGridItems as gridItem (gridItem.id)}
          <div class="item" animate:flip={{ duration: 200 }}>
          {#if canCombineWith(gridItem)}
            <div class="combine_hit_zone" data-combine-id={gridItem.id} aria-hidden="true"></div>
            <div class="combine_drop_zone" class:combine_target={combineTargetId === gridItem.id} aria-hidden="true"></div>
          {/if}
          {#if gridItem.kind === "folder"}
            <button
              class="folder_button"
              type="button"
              title={gridItem.folder.title}
              oncontextmenu={(event) => showGroupMenu(event, gridItem.folder)}
              onclick={() => (currentFolder = gridItem.folder)}
            >
              <WebsiteFolderTile
                folder={gridItem.folder}
                sites={sitesInFolder(gridItem.folder)}
              />
            </button>
          {:else}
            {@const pinned = gridItem.website}
              <a
                class="tile_link"
                href={pinned.url}
                target={newTabOpen ? "_blank" : "_self"}
                rel={newTabOpen ? "noreferrer" : undefined}
                oncontextmenu={(e) => showContextMenu(e, pinned)}
              >
                <WebsiteTile site={pinned} loading={capturingWebsiteId === pinned.id} />
              </a>
          {/if}
          </div>
        {/each}
      </div>
      {:else if currentFolder}
        <div class="empty_folder" aria-label={t("nt_no_pinned")}></div>
      {/if}
    </section>
  {:else}
    <NoData
      iconName="Sprout"
      title={t("nt_no_pinned")}
      text={t("nt_no_pinned_desc")}
    />
  {/if}

  {#if !currentFolder && filteredFrequentSites.length}
    <section class="section">
      <G full>
        <Divider />
      </G>
      <div class="frequent_section_body">
        <div class="frequent_title_sentinel"></div>
        <div
          class="frequent_section_title"
          class:frequent_section_title_stuck={frequentTitleStuck}
          use:trackStickyFrequentTitle
        >
          <div class="frequent_title_main">
            <Icon
              name="Sparkles"
              color="var(--c-text)"
              opacity={0.6}
              size={16}
            />
            <T type="m" color="var(--c-text-1)" fullWidth={false}>
              {t("nt_frequent_section")}
            </T>
            <Button
              onclick={() => (showFrequentInfo = true)}
              title={t("nt_frequent_info_title")}
            >
              <G>
                <Icon
                  name="Info"
                  color="var(--c-text)"
                  opacity={0.6}
                  size={16}
                />
              </G>
            </Button>
          </div>
          {#if list}
            <Button onclick={onToggleList}>
              <G><Icon name="Grid2x2" color="var(--c-text)" opacity={0.6} /></G>
            </Button>
          {:else}
            <Button onclick={onToggleList} bg="var(--c-text)">
              <G><Icon name="Grid2x2" color="var(--c-bg)" /></G>
            </Button>
          {/if}
        </div>
        <div class="content {list ? 'list' : 'grid'}">
          {#each filteredFrequentSites as site (site.domain)}
            <div class="item" class:list_item={list}>
              <a
                href={site.url}
                target={newTabOpen ? "_blank" : "_self"}
                rel={newTabOpen ? "noreferrer" : undefined}
                class:list_link={list}
                class:ctx={showFrequentMenu &&
                  currentFrequent?.domain === site.domain}
                oncontextmenu={(e) => showFrequentContextMenu(e, site)}
              >
                {#if list}
                  <G>
                    <BkmkIcon imgUrl={site.url} alt={site.title} size="s" />
                  </G>
                  <G full align="c">
                    <T nowrap type="m" bold>{site.title}</T>
                  </G>
                  <G align="c">
                    <T type="s" nowrap>{site.visitCount}</T>
                    <Icon
                      name="Eye"
                      color="var(--c-text)"
                      opacity={0.6}
                      size={16}
                    />
                  </G>
                {:else}
                  <BkmkIcon imgUrl={site.url} alt={site.title} size="l" />
                {/if}
              </a>
              {#if !list}
                <T nowrap align="c" type="s">{site.title}</T>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </section>
  {/if}
</div>

{#if showAdd && !readOnly}
  <AddPinned
    isEdit={openByEdit}
    urlValue={openByEdit ? currentPinned?.url : undefined}
    titleValue={openByEdit ? currentPinned?.title : undefined}
    folderIdValue={openByEdit ? currentPinned?.folderId : currentFolder?.id}
    folders={webSiteFolders}
    onSave={clickSaveWebSite}
    onSaveFolder={currentFolder ? undefined : clickSaveFolder}
    onDelete={clickDeleteWebSite}
    onclickClose={clickCloseAdd}
  />
{/if}

{#if groupMenu && !readOnly}
  <CommonGroupMenu group={groupMenu} x={menuX} y={menuY} onClose={() => (groupMenu = undefined)} {onUpdate} />
{/if}

{#if movingSite && !readOnly}
  <MoveCommonSites folders={webSiteFolders}
    currentFolderId={webSiteFolders.some((folder) => folder.id === movingSite?.folderId) ? movingSite.folderId : undefined}
    onSave={moveSite} onclickClose={() => (movingSite = undefined)} />
{/if}

{#if showPinnedMenu && currentPinned && !readOnly}
  <LinkContextMenu
    x={menuX}
    y={menuY}
    url={currentPinned.url}
    onClose={() => (showPinnedMenu = false)}
  >
    <Button full onclick={() => void clickCaptureScreenshot()}>
      <G>
        <T>{t("nt_get_screenshot")}</T>
      </G>
    </Button>
    {#if currentPinnedHasScreenshot}
      <Button full onclick={() => void clickRemoveScreenshot()}>
        <G>
          <T>{t("nt_remove_screenshot")}</T>
        </G>
      </Button>
    {/if}
    <Button full onclick={clickEditWebSite}>
      <G>
        <T>{t("nt_edit")}</T>
      </G>
    </Button>
    <Button full onclick={openMoveSite}>
      <G><T>{t("nt_move")}</T></G>
    </Button>
    <Button full onclick={() => void clickDeleteWebSite()}>
      <G>
        <T color="var(--c-red)">{t("nt_delete")}</T>
      </G>
    </Button>
  </LinkContextMenu>
{/if}

{#if confirmOptions}
  <ConfirmDialog
    title={confirmOptions.title}
    description={confirmOptions.description}
    confirmText={confirmOptions.confirmText ?? t("nt_delete")}
    onclickClose={() => closeConfirm(false)}
    onConfirm={() => closeConfirm(true)}
  />
{/if}

{#if showFrequentMenu && currentFrequent && !readOnly}
  <LinkContextMenu
    x={menuX}
    y={menuY}
    url={currentFrequent.url}
    onClose={() => (showFrequentMenu = false)}
  >
    <Button full onclick={clickAddFrequentToPinned}>
      <G>
        <T>{t("nt_add_to_pinned")}</T>
      </G>
    </Button>
  </LinkContextMenu>
{/if}

{#if showFrequentInfo}
  <Popup
    type="s"
    title={t("nt_frequent_info_title")}
    onclickClose={() => (showFrequentInfo = false)}
  >
    <div class="info_body">
      <T type="s" color="var(--c-text-1)">
        {t("nt_frequent_info_desc")}
      </T>
    </div>
  </Popup>
{/if}

<style>
  .page {
    display: flex;
    flex-direction: column;
    width: 100%;
    align-items: center;
    gap: calc(var(--gap) * 2);
    position: relative;
  }
  .section {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    position: relative;
    padding: var(--gap);
    border-radius: var(--r1);
  }

  .padding_section {
    gap: var(--gap);
  }
  .error_state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: calc(var(--gap) * 2);
    width: 100%;
    min-height: 220px;
    padding: calc(var(--gap) * 3);
    box-sizing: border-box;
  }
  .skeleton_item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0;
  }
  .skeleton_icon,
  .skeleton_text {
    background: var(--c-mask);
    overflow: hidden;
    position: relative;
  }
  .skeleton_icon {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 10;
    border-radius: var(--r1);
  }
  .skeleton_text {
    display: none;
    border-radius: 999px;
  }
  .skeleton_shimmer::after {
    content: "";
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(
      90deg,
      transparent,
      var(--c-mask1),
      transparent
    );
    animation: skeleton-shimmer 1.25s ease-in-out infinite;
  }
  @keyframes skeleton-shimmer {
    to {
      transform: translateX(100%);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .skeleton_shimmer::after {
      animation: none;
    }
  }
  .item {
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    border-radius: var(--r);
    position: relative;
    cursor: default !important;
  }
  .content {
    width: 100%;
    box-sizing: border-box;
    border-radius: var(--r1);
  }
  .frequent_section_body {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
  }
  .combine_hit_zone {
    position: absolute;
    inset: 0 33.333%;
    visibility: hidden;
    pointer-events: none;
  }
  .combine_drop_zone {
    position: absolute;
    inset: var(--gap);
    z-index: 6;
    border: 2px solid var(--c-mask);
    border-radius: var(--r1);
    pointer-events: none;
    transition: inset 120ms ease, border-radius 120ms ease, border-color 120ms ease, background-color 120ms ease;
  }
  .combine_drop_zone.combine_target {
    inset: calc(var(--gap) - 4px);
    border-radius: calc(var(--r1) + 4px);
    border-color: var(--c-main);
    background-color: var(--c-main-3);
  }
  .frequent_title_sentinel {
    width: 100%;
    height: 1px;
    margin-bottom: -1px;
    pointer-events: none;
  }
  .frequent_section_title {
    position: sticky;
    top: calc(var(--gap) * -1);
    z-index: 1;
    display: flex;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
    border-radius: var(--r);
    transition: background-color 0.16s ease;
  }
  .frequent_title_main {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    min-width: 0;
    flex: 1;
  }
  .frequent_section_title_stuck {
    background-color: var(--c-background-surface, var(--c-bg1));
    background-image: linear-gradient(var(--c-surface), var(--c-surface));
  }
  .drag {
    outline: var(--c-mask) 2px dashed;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
  .pinned_grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
  .skeleton_grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .folder_button,
  .tile_link {
    display: flex;
    width: 100%;
    margin: 0;
    padding: var(--gap);
    border: 0;
    background: transparent;
    color: inherit;
    text-decoration: none;
    cursor: default;
    border-radius: var(--r2);
  }
  .empty_folder {
    grid-column: 1 / -1;
    min-height: 120px;
    display: grid;
    place-items: center;
    color: var(--c-text-2);
    border: 2px dashed var(--c-border1);
    border-radius: var(--r1);
  }
  @media (max-width: 900px) {
    .pinned_grid, .skeleton_grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
  @media (max-width: 560px) {
    .pinned_grid, .skeleton_grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  .list {
    display: flex;
    flex-direction: column;
  }
  .list_item {
    padding: 0;
    width: 100%;
  }
  .list_link {
    width: 100%;
    flex-direction: row;
    align-items: center;
    border-radius: var(--r);
  }
  .info_body {
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
    white-space: pre-line;
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
  }
  .folder_button:hover,
  a:hover {
    background-color: var(--c-mask);
  }

  .folder_button:focus-visible,
  a:focus-visible {
    outline: var(--c-text) 2px solid;
  }

  .folder_button:active,
  a:active {
    background-color: var(--c-mask1);
  }

  .folder_button:focus,
  a:focus {
    outline: 2px var(--c-text) solid;
  }
  a.ctx {
    outline: 2px var(--c-text) solid;
  }

</style>
