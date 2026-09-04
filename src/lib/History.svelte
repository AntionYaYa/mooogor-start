<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import type { HistoryItem, HistoryRange } from "@/lib/browser/history";
  import T from "./components/T.svelte";
  import G from "./components/G.svelte";
  import BkmkIcon from "./BkmkIcon.svelte";
  import Icon from "./components/Icon.svelte";
  import LinkContextMenu from "./LinkContextMenu.svelte";
  import Button from "./components/Button.svelte";
  import ClearHistoryDialog from "./ClearHistoryDialog.svelte";
  import ConfirmDialog from "./ConfirmDialog.svelte";
  import BatchToolbar from "./components/BatchToolbar.svelte";
  import { addToPinneds } from "@/lib/utils/pinneds";
  import NoData from "./NoData.svelte";
  import { t } from "@/lib/utils/i18n";

  type HistoryGroup = HistoryRange & { items: HistoryItem[] };

  interface Props {
    newTabOpen?: boolean;
    settingsOpen?: boolean;
    clearRequestKey?: number;
    onClearableChange?: (clearable: boolean) => void;
  }

  let {
    newTabOpen = false,
    settingsOpen = false,
    clearRequestKey = 0,
    onClearableChange,
  }: Props = $props();

  let topGroups: HistoryGroup[] = $state([]);
  let dayGroups: HistoryGroup[] = $state([]);
  let loadingMore = $state(false);
  let nextDayOffset = $state(1); // 1 = 昨天
  let hasMore = $state(true);
  let loadMoreTask: Promise<void> | null = null;
  let handledClearRequestKey = $state(0);
  let pageEl: HTMLElement | undefined = $state();
  let stuckHistoryGroupKeys = $state<Set<string>>(new Set());
  let multiSelectMode = $state(false);
  let selectedUrls = $state<Set<string>>(new Set());
  let lastClickedIndex = $state(-1);
  let batchActionLoading = $state(false);
  let confirmDelete = $state(false);

  let currentHistory: HistoryItem | undefined = $state();
  let showMenu = $state(false);

  const allGroups = $derived([...topGroups, ...dayGroups]);
  const visibleHistoryItems = $derived.by(() => {
    const seen = new Set<string>();
    return allGroups.flatMap((group) => group.items).filter((item) => {
      const url = item.url ?? "";
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  });
  const selectedCount = $derived(selectedUrls.size);
  const allSelected = $derived(
    multiSelectMode &&
      visibleHistoryItems.length > 0 &&
      selectedCount === visibleHistoryItems.length,
  );
  type ClearRangeOption = "1h" | "today" | "today-yesterday" | "all";
  const clearRangeOptions = $derived.by(() => [
    { key: "1h" as ClearRangeOption, label: t("nt_history_1h") },
    { key: "today" as ClearRangeOption, label: t("nt_history_today") },
    {
      key: "today-yesterday" as ClearRangeOption,
      label: t("nt_history_today_yesterday"),
    },
    { key: "all" as ClearRangeOption, label: t("nt_history_all_time") },
  ]);
  const hasHistory = $derived.by(() => {
    return allGroups.some((group) => group.items.length);
  });
  const showEmpty = $derived.by(() => !hasHistory && !loadingMore && !hasMore);

  let menuX = $state(0);
  let menuY = $state(0);

  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const MAX_PER_DAY = 2000;
  const MAX_LOOKBACK_DAYS = 60;

  function startOfDay(ts: number) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  async function fetchRange(
    startTime: number,
    endTime: number,
    maxResults: number,
  ): Promise<HistoryItem[]> {
    if (endTime <= startTime) return [];
    return (await browser.runtime.sendMessage({
      type: "getHistoryItems",
      payload: { startTime, endTime, maxResults },
    })) as HistoryItem[];
  }

  function dedupeByUrl(items: HistoryItem[]) {
    const seen = new Set<string>();
    const result: HistoryItem[] = [];
    for (const item of items) {
      const url = item.url ?? "";
      if (!url || seen.has(url)) continue;
      seen.add(url);
      result.push(item);
    }
    return result;
  }

  function queueLoadMore() {
    if (!hasMore || loadingMore || loadMoreTask) return;
    loadMoreTask = loadMoreDays().finally(() => {
      loadMoreTask = null;
    });
  }

  function infiniteScroll(node: HTMLElement) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        queueLoadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return {
      destroy() {
        observer.disconnect();
      },
    };
  }

  function formatDayLabel(dayStartTs: number, offset: number) {
    if (offset === 1) return t("nt_history_yesterday");
    const d = new Date(dayStartTs);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function padTime(value: number) {
    return String(value).padStart(2, "0");
  }

  function formatHistoryTime(history: HistoryItem) {
    const ts = history.lastVisitTime ?? 0;
    if (!ts) return "";
    const d = new Date(ts);
    const hours = padTime(d.getHours());
    const minutes = padTime(d.getMinutes());
    return `${hours}:${minutes}`;
  }

  function getHistoryTitle(history: HistoryItem) {
    return (history.title ?? "").trim() || history.url || t("nt_unnamed");
  }

  async function loadToday() {
    const now = Date.now();
    const tenMinStart = now - 10 * MINUTE;
    const oneHourStart = now - 1 * HOUR;
    const todayStart = startOfDay(now);

    const fetchedTodayItems = await fetchRange(todayStart, now, MAX_PER_DAY);
    const todayUnique = dedupeByUrl(fetchedTodayItems);

    const recentItems = todayUnique.filter((i) => (i.lastVisitTime ?? 0) >= tenMinStart);
    const oneHourItems = todayUnique.filter((i) => {
      const ts = i.lastVisitTime ?? 0;
      return ts >= oneHourStart && ts < tenMinStart;
    });
    const todayItems = todayUnique.filter((i) => {
      const ts = i.lastVisitTime ?? 0;
      return ts >= todayStart && ts < oneHourStart;
    });

    const nextTopGroups: HistoryGroup[] = [];
    if (recentItems.length) {
      nextTopGroups.push({
        key: "recent",
        label: t("nt_history_recent"),
        startTime: tenMinStart,
        endTime: now,
        count: recentItems.length,
        items: recentItems,
      });
    }
    if (oneHourItems.length) {
      nextTopGroups.push({
        key: "one-hour",
        label: t("nt_history_1h"),
        startTime: oneHourStart,
        endTime: tenMinStart,
        count: oneHourItems.length,
        items: oneHourItems,
      });
    }
    if (todayItems.length) {
      nextTopGroups.push({
        key: "today",
        label: t("nt_history_today"),
        startTime: todayStart,
        endTime: oneHourStart,
        count: todayItems.length,
        items: todayItems,
      });
    }
    topGroups = nextTopGroups;
    notifyClearable();

    // Ensure at least one older-day group is available after entering History.
    // Relying solely on intersection callbacks can miss initial loads on tab switches.
    if (!dayGroups.length && hasMore) {
      await loadMoreDays();
    }
  }

  async function loadDay(offset: number): Promise<HistoryGroup> {
    const now = Date.now();
    const dayStart = startOfDay(now) - offset * DAY;
    const dayEnd = dayStart + DAY;
    const items = await fetchRange(dayStart, dayEnd, MAX_PER_DAY);
    return {
      key: `day-${offset}`,
      label: formatDayLabel(dayStart, offset),
      startTime: dayStart,
      endTime: dayEnd,
      count: dedupeByUrl(items).length,
      items: dedupeByUrl(items),
    };
  }

  async function loadMoreDays() {
    if (loadingMore || !hasMore) return;
    loadingMore = true;
    try {
      while (nextDayOffset <= MAX_LOOKBACK_DAYS) {
        const group = await loadDay(nextDayOffset);
        nextDayOffset += 1;
        if (group.items.length) {
          dayGroups = [...dayGroups, group];
          notifyClearable();
          return;
        }
      }
      hasMore = false;
      notifyClearable();
    } finally {
      loadingMore = false;
    }
  }

  function isFirstScreenFilled() {
    if (!pageEl) return true;
    const scrollContainer = pageEl.closest(".tabs_contents");
    if (!(scrollContainer instanceof HTMLElement)) return true;
    return pageEl.scrollHeight > scrollContainer.clientHeight;
  }

  function setHistoryGroupStuck(key: string, stuck: boolean) {
    const next = new Set(stuckHistoryGroupKeys);
    if (stuck) {
      next.add(key);
    } else {
      next.delete(key);
    }
    stuckHistoryGroupKeys = next;
  }

  function trackStickyTitle(node: HTMLElement, key: string) {
    const scrollContainer = pageEl?.closest(".tabs_contents");
    const root = scrollContainer instanceof HTMLElement ? scrollContainer : window;
    let groupKey = key;
    let frame = 0;

    const updateStuckState = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const groupRect = node.parentElement?.getBoundingClientRect();
        const titleRect = node.getBoundingClientRect();
        setHistoryGroupStuck(
          groupKey,
          !!groupRect && titleRect.top > groupRect.top + 0.5,
        );
      });
    };

    root.addEventListener("scroll", updateStuckState, { passive: true });
    window.addEventListener("resize", updateStuckState);
    updateStuckState();

    return {
      update(nextKey: string) {
        if (nextKey === groupKey) return;
        setHistoryGroupStuck(groupKey, false);
        groupKey = nextKey;
        updateStuckState();
      },
      destroy() {
        cancelAnimationFrame(frame);
        root.removeEventListener("scroll", updateStuckState);
        window.removeEventListener("resize", updateStuckState);
        setHistoryGroupStuck(groupKey, false);
      },
    };
  }

  async function ensureFirstScreenFilled() {
    let guard = 0;
    const maxBatches = 8;
    await tick();
    while (hasMore && !loadingMore && !isFirstScreenFilled() && guard < maxBatches) {
      await loadMoreDays();
      await tick();
      guard += 1;
    }
  }

  onMount(async () => {
    window.addEventListener("keydown", handleKeyDown);
    handledClearRequestKey = clearRequestKey;
    await loadToday();
    await ensureFirstScreenFilled();
  });

  onDestroy(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });

  function notifyClearable() {
    onClearableChange?.(hasHistory);
  }

  function closeClearDialog() {
    handledClearRequestKey = clearRequestKey;
  }

  async function clickAddtoPinneds() {
    showMenu = false;
    if (!currentHistory) return;
    if (!currentHistory.url) return;
    await addToPinneds(currentHistory.url, currentHistory.title);
    currentHistory = undefined;
  }

  function showContextMenu(e: MouseEvent, history: HistoryItem) {
    e.preventDefault();
    e.stopPropagation();

    currentHistory = history;
    menuX = e.clientX;
    menuY = e.clientY;
    showMenu = true;
  }

  async function enterMultiSelect() {
    showMenu = false;
    const url = currentHistory?.url;
    multiSelectMode = true;
    selectedUrls = url ? new Set([url]) : new Set();
    lastClickedIndex = url
      ? visibleHistoryItems.findIndex((item) => item.url === url)
      : -1;
    await tick();
    pageEl?.querySelector<HTMLElement>(".item.selected")?.focus();
  }

  function clearSelection(force = false) {
    if (batchActionLoading && !force) return;
    multiSelectMode = false;
    selectedUrls = new Set();
    lastClickedIndex = -1;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== "Escape" || confirmDelete || batchActionLoading) return;
    if (showMenu) {
      e.preventDefault();
      showMenu = false;
      return;
    }
    if (multiSelectMode) {
      e.preventDefault();
      clearSelection();
    }
  }

  function toggleSelect(history: HistoryItem) {
    const url = history.url;
    if (!url || batchActionLoading) return;
    const next = new Set(selectedUrls);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    if (next.size === 0) {
      clearSelection();
      return;
    }
    selectedUrls = next;
  }

  function handleItemClick(e: MouseEvent, history: HistoryItem) {
    if (!multiSelectMode || batchActionLoading) return;
    e.preventDefault();
    const index = visibleHistoryItems.findIndex(
      (item) => item.url === history.url,
    );
    if (e.shiftKey && lastClickedIndex >= 0 && index >= 0) {
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      selectedUrls = new Set(
        visibleHistoryItems
          .slice(start, end + 1)
          .map((item) => item.url)
          .filter((url): url is string => !!url),
      );
    } else {
      toggleSelect(history);
      lastClickedIndex = index;
    }
  }

  function toggleSelectAll() {
    if (batchActionLoading) return;
    if (allSelected) {
      clearSelection();
    } else {
      selectedUrls = new Set(
        visibleHistoryItems
          .map((item) => item.url)
          .filter((url): url is string => !!url),
      );
    }
  }

  async function deleteSelected() {
    if (!selectedCount || batchActionLoading) return;
    confirmDelete = false;
    batchActionLoading = true;
    try {
      await browser.runtime.sendMessage({
        type: "deleteHistoryUrls",
        payload: { urls: [...selectedUrls] },
      });
      clearSelection(true);
      await reloadHistory();
    } finally {
      batchActionLoading = false;
    }
  }

  async function reloadHistory() {
    topGroups = [];
    dayGroups = [];
    nextDayOffset = 1;
    hasMore = true;
    showMenu = false;
    currentHistory = undefined;
    await loadToday();
    await ensureFirstScreenFilled();
  }

  async function clearHistoryByPreset(key: string) {
    const now = Date.now();
    const todayStart = startOfDay(now);
    let startTime = 0;
    switch (key as ClearRangeOption) {
      case "1h":
        startTime = now - HOUR;
        break;
      case "today":
        startTime = todayStart;
        break;
      case "today-yesterday":
        startTime = todayStart - DAY;
        break;
      case "all":
      default:
        startTime = 0;
        break;
    }
    await browser.runtime.sendMessage({
      type: "deleteHistoryRange",
      payload: { startTime, endTime: now },
    });

    closeClearDialog();
    await reloadHistory();
  }
</script>

<div class="page" bind:this={pageEl}>
  {#if showEmpty}
    <NoData iconName="History" title={t("nt_history_empty")} />
  {:else}
    <div class="history">
      {#each allGroups as group}
        {@render temHistoryGroup(group)}
      {/each}
      {#if hasMore}
        <div class="more_trigger" use:infiniteScroll>
          {#if loadingMore}
            <Icon name="Loading" color="var(--c-text)" />
          {/if}
        </div>
      {/if}
    </div>
    <div class="batch_bar_container" class:settings_open={settingsOpen}>
      <BatchToolbar
        show={multiSelectMode}
        count={selectedCount}
        {allSelected}
        showDeleteText
        disabled={batchActionLoading}
        onselectall={toggleSelectAll}
        ondelete={() => (confirmDelete = true)}
        onclose={() => clearSelection()}
      />
    </div>
  {/if}
</div>

{#if showMenu && currentHistory}
  <LinkContextMenu
    x={menuX}
    y={menuY}
    url={currentHistory.url ?? ""}
    onClose={() => (showMenu = false)}
  >
    <Button full onclick={clickAddtoPinneds}>
      <G>
        <T>{t("nt_add_to_pinned")}</T>
      </G>
    </Button>
    <Button full onclick={enterMultiSelect}>
      <G>
        <T>{t("nt_multi_select")}</T>
      </G>
    </Button>
  </LinkContextMenu>
{/if}

{#if confirmDelete}
  <ConfirmDialog
    title={t("nt_confirm_delete_history_title")}
    description={t("nt_delete_history_items_confirm", String(selectedCount))}
    confirmText={t("nt_delete")}
    onclickClose={() => (confirmDelete = false)}
    onConfirm={deleteSelected}
  />
{/if}

{#if clearRequestKey > handledClearRequestKey && hasHistory}
  <ClearHistoryDialog
    options={clearRangeOptions}
    onclickClose={closeClearDialog}
    onConfirm={clearHistoryByPreset}
  />
{/if}

{#snippet temHistoryGroup(group: HistoryGroup)}
  <div class="history_group">
    <div
      class="history_group_title"
      class:history_group_title_stuck={stuckHistoryGroupKeys.has(group.key)}
      use:trackStickyTitle={group.key}
    >
      <T type="s">{group.label}</T>
    </div>
    {#each group.items as history}
      {@render temHistoryItem(history)}
    {/each}
  </div>
{/snippet}

{#snippet temHistoryItem(history: HistoryItem)}
  <a
    class="item"
    class:selected={multiSelectMode && !!history.url && selectedUrls.has(history.url)}
    href={history.url}
    target={newTabOpen ? "_blank" : "_self"}
    rel={newTabOpen ? "noreferrer" : undefined}
    onclick={multiSelectMode ? (e) => handleItemClick(e, history) : undefined}
    onkeydown={multiSelectMode
      ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleSelect(history);
          }
        }
      : undefined}
    oncontextmenu={(e) => showContextMenu(e, history)}
    class:ctx={showMenu && currentHistory === history}
  >
  
    <G full align="c" gap>
      <BkmkIcon imgUrl={history.url} alt={history.title ?? ""} size="s" />
      <T type="m" bold nowrap>{getHistoryTitle(history)}</T>
    </G>
    <G align="c">
      <T type="s" nowrap color="var(--c-text-1)">{formatHistoryTime(history)}</T>
    </G>
  </a>
{/snippet}

<style>
  .page {
    display: flex;
    flex-direction: column;
    width: 100%;
    align-items: center;
    position: relative;
  }
  .history {
    display: flex;
    flex-direction: column;
    gap: var(--gap);
    width: 100%;
    box-sizing: border-box;
  }
  .history_group {
    display: flex;
    flex-direction: column;
    gap: var(--gap);
    width: 100%;
    box-sizing: border-box;
  }
  .history_group_title {
    position: sticky;
    top: calc(var(--gap) * -1);
    z-index: 1;
    display: flex;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
    isolation: isolate;
    border-radius: var(--r);
    transition: background-color 0.16s ease;
  }
  .history_group_title_stuck {
    background-color: var(--c-background-surface, var(--c-bg1));
    background-image: linear-gradient(var(--c-surface), var(--c-surface));
  }
  .item {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
    text-decoration: none;
    padding: var(--gap);
    border-radius: var(--r);
    cursor: default;
  }
  .item:hover {
    background-color: var(--c-mask);
  }
  .item.ctx {
    outline: 2px var(--c-text) solid;
  }
  .item.selected {
    outline: 2px solid var(--c-main);
    background-color: var(--c-main-3);
  }
  .item.selected:hover {
    background-color: var(--c-main-3);
  }
  .item:active {
    background-color: var(--c-mask1);
  }
  .item:focus-visible {
    outline: var(--c-text) 2px solid;
  }

  .more_trigger {
    display: flex;
    justify-content: center;
  }
  .batch_bar_container {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    justify-content: center;
    padding: var(--gap);
    width: min(400px, calc(100% - var(--gap) * 4));
    box-sizing: border-box;
    pointer-events: none;
    z-index: 20;
  }
  .batch_bar_container.settings_open {
    left: calc((100vw - 300px - var(--gap)) / 2);
  }
</style>
