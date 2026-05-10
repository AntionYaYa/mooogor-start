<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    deleteHistoryRange,
    type HistoryItem,
    type HistoryRange,
  } from "@/lib/browser/history";
  import T from "./components/T.svelte";
  import G from "./components/G.svelte";
  import BkmkIcon from "./BkmkIcon.svelte";
  import Icon from "./components/Icon.svelte";
  import LinkContextMenu from "./LinkContextMenu.svelte";
  import Button from "./components/Button.svelte";
  import ClearHistoryDialog from "./ClearHistoryDialog.svelte";
  import { addToPinneds } from "@/lib/utils/pinneds";
  import NoData from "./NoData.svelte";
  import { t } from "@/lib/utils/i18n";

  type HistoryGroup = HistoryRange & { items: HistoryItem[] };

  interface Props {
    newTabOpen?: boolean;
    clearRequestKey?: number;
    onClearableChange?: (clearable: boolean) => void;
  }

  let {
    newTabOpen = false,
    clearRequestKey = 0,
    onClearableChange,
  }: Props = $props();

  let topGroups: HistoryGroup[] = $state([]);
  let dayGroups: HistoryGroup[] = $state([]);
  let loadingMore = $state(false);
  let nextDayOffset = $state(1); // 1 = 昨天
  let hasMore = $state(true);
  let loadMoreTask: Promise<void> | null = null;
  let showClearDialog = $state(false);
  let handledClearRequestKey = $state(0);
  let pageEl: HTMLElement | undefined = $state();

  let currentHistory: HistoryItem | undefined = $state();
  let showMenu = $state(false);

  const allGroups = $derived([...topGroups, ...dayGroups]);
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
    const items = await browser.history.search({
      text: "",
      startTime,
      endTime,
      maxResults,
    });
    return items;
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
          return;
        }
      }
      hasMore = false;
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
    handledClearRequestKey = clearRequestKey;
    await loadToday();
    await ensureFirstScreenFilled();
  });

  $effect(() => {
    onClearableChange?.(hasHistory);
  });

  $effect(() => {
    if (clearRequestKey <= handledClearRequestKey) return;
    if (!hasHistory) return;
    handledClearRequestKey = clearRequestKey;
    showClearDialog = true;
  });

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
    await deleteHistoryRange({ startTime, endTime: now });

    showClearDialog = false;
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
  </LinkContextMenu>
{/if}

{#if showClearDialog}
  <ClearHistoryDialog
    options={clearRangeOptions}
    onclickClose={() => (showClearDialog = false)}
    onConfirm={clearHistoryByPreset}
  />
{/if}

{#snippet temHistoryGroup(group: HistoryGroup)}
  <div class="history_group">
    <div class="history_group_title">
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
    href={history.url}
    target={newTabOpen ? "_blank" : "_self"}
    rel={newTabOpen ? "noreferrer" : undefined}
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
    backdrop-filter: var(--bg-blur);
    border-radius: var(--r);
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
    background-color: var(--c-mask);
  }
  .item.ctx {
    outline: 2px var(--c-text) solid;
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
</style>
