<script lang="ts">
  import { onMount } from "svelte";
  import type { HistoryItem } from "../entrypoints/newtab/methods/getHistorys";
  import T from "./components/T.svelte";
  import G from "./components/G.svelte";
  import BkmkIcon from "./BkmkIcon.svelte";
  import Icon from "./components/Icon.svelte";
  import LinkContextMenu from "./LinkContextMenu.svelte";
  import Button from "./components/Button.svelte";
  import DragToPinneds from "./DragToPinneds.svelte";
  import { addToPinneds } from "@/lib/utils/pinneds";
  import NoData from "./NoData.svelte";
  import { t } from "@/lib/utils/i18n";

  interface Props {
    newTabOpen?: boolean;
  }

  let { newTabOpen = false }: Props = $props();

  let tenMinHistory: HistoryItem[] = $state([]);
  let oneHHistory: HistoryItem[] = $state([]);
  let todayHistory: HistoryItem[] = $state([]);
  let dayGroups: { label: string; items: HistoryItem[] }[] = $state([]);
  let loadingMore = $state(false);
  let nextDayOffset = $state(1); // 1 = 昨天
  let hasMore = $state(true);
  let loadMoreTask: Promise<void> | null = null;

  let currentHistory: HistoryItem | undefined = $state();
  let showMenu = $state(false);
  let dragging = $state(false);

  const hasHistory = $derived.by(() => {
    if (tenMinHistory.length || oneHHistory.length || todayHistory.length) {
      return true;
    }
    return dayGroups.some((group) => group.items.length);
  });
  const showEmpty = $derived.by(() => !hasHistory && !loadingMore && !hasMore);

  let menuX = $state(0);
  let menuY = $state(0);

  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const MAX_PER_DAY = 200;
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

  async function loadToday() {
    const now = Date.now();
    const tenMinStart = now - 10 * MINUTE;
    const oneHourStart = now - 1 * HOUR;
    const todayStart = startOfDay(now);

    const todayItems = await fetchRange(todayStart, now, MAX_PER_DAY);
    const todayUnique = dedupeByUrl(todayItems);

    tenMinHistory = todayUnique.filter(
      (i) => (i.lastVisitTime ?? 0) >= tenMinStart,
    );
    oneHHistory = todayUnique.filter((i) => {
      const ts = i.lastVisitTime ?? 0;
      return ts >= oneHourStart && ts < tenMinStart;
    });
    todayHistory = todayUnique.filter((i) => {
      const ts = i.lastVisitTime ?? 0;
      return ts >= todayStart && ts < oneHourStart;
    });

    if (!todayUnique.length) {
      await loadMoreDays();
    }
  }

  async function loadDay(offset: number) {
    const now = Date.now();
    const dayStart = startOfDay(now) - offset * DAY;
    const dayEnd = dayStart + DAY;
    const items = await fetchRange(dayStart, dayEnd, MAX_PER_DAY);
    return {
      label: formatDayLabel(dayStart, offset),
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

  onMount(async () => {
    await loadToday();
  });

  async function clickAddtoPinneds() {
    showMenu = false;
    if (!currentHistory) return;
    if (!currentHistory.url) return;
    await addToPinneds(currentHistory.url, currentHistory.title);
    currentHistory = undefined;
    dragging = false;
  }

  function showContextMenu(e: MouseEvent, history: HistoryItem) {
    e.preventDefault();
    e.stopPropagation();

    currentHistory = history;
    menuX = e.clientX;
    menuY = e.clientY;
    showMenu = true;
  }

  function dragStart(e: DragEvent, history: HistoryItem) {
    currentHistory = history;
    e.dataTransfer?.setData("text/plain", history.url ?? "");
    dragging = true;
  }

  function dragEnd() {
    dragging = false;
  }
</script>

<div class="page">
  {#if showEmpty}
    <NoData iconName="History" title={t("nt_history_empty")} />
  {:else}
    <div class="history">
      <DragToPinneds active={dragging} onDrop={clickAddtoPinneds} />
      {#if tenMinHistory.length}
        {@render temHistoryGroup(t("nt_history_recent"), tenMinHistory)}
      {/if}
      {#if oneHHistory.length}
        {@render temHistoryGroup(t("nt_history_1h"), oneHHistory)}
      {/if}
      {#if todayHistory.length}
        {@render temHistoryGroup(t("nt_history_today"), todayHistory)}
      {/if}
      {#each dayGroups as group}
        {@render temHistoryGroup(group.label, group.items)}
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

{#snippet temHistoryGroup(title: string, items: HistoryItem[])}
  <G full vertical gap>
    <T type="s">{title}</T>
    {#each items as history}
      {@render temHistoryItem(history)}
    {/each}
  </G>
{/snippet}

{#snippet temHistoryItem(history: HistoryItem)}
  <a
    class="item"
    href={history.url}
    target={newTabOpen ? "_blank" : "_self"}
    rel={newTabOpen ? "noreferrer" : undefined}
    draggable={!!history.url}
    ondragstart={(e) => dragStart(e, history)}
    ondragend={dragEnd}
    oncontextmenu={(e) => showContextMenu(e, history)}
    class:ctx={showMenu && currentHistory === history}
  >
    <G full align="c" gap>
      <BkmkIcon imgUrl={history.url} alt={history.title ?? ""} size="s" />
      <T type="m" bold nowrap>{history.title}</T>
    </G>
    <G align="c">
      <Icon name="Eye" color="var(--c-text)" opacity={0.6} size={16} />
      <T type="s" nowrap>{history.visitCount}</T>
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
