<script lang="ts">
    import { onMount } from "svelte";
    import { slide } from "svelte/transition";
    import { flip } from "svelte/animate";
    import { dndzone } from "svelte-dnd-action";
    import type { DndEvent } from "svelte-dnd-action";
    import type {
        Engine,
        EngineCategory,
        EngineCategoryItem,
    } from "@/lib/DB/DB";
    import {
        ensureDefaultEngines,
        ensureDefaultEngineCategories,
        FALLBACK_ENGINE_CATEGORY_ID,
        getEnabledEngines,
        getDisabledEngines,
        getEngineCategories,
        updateEnginesState,
    } from "@/lib/DB/DB";
    import { buildDefaultEngines } from "@/lib/DB/defaultEnginesFactory";
    import {
        type BookmarkSubType,
        searchBookmarks,
    } from "@/lib/browser/bookmarks";
    import {
        type HistoryItem,
        searchHistory,
    } from "@/lib/browser/history";
    import Button from "./components/Button.svelte";
    import BkmkIcon from "./BkmkIcon.svelte";
    import Icon from "./components/Icon.svelte";
    import T from "./components/T.svelte";
    import G from "./components/G.svelte";
    import { t } from "@/lib/utils/i18n";
    import Tab from "./components/Tab.svelte";
    import type { TabItem } from "./components/Tab.svelte";
    import EngineIcon from "./EngineIcon.svelte";
    import { buildDefaultEngineCategories } from "@/lib/config/engineCategories";

    type ItemType = BookmarkSubType | "engine" | "todo" | "history";

    interface Props {
        newTabOpen?: boolean;
        searchBookmarks?: boolean;
        searchHistory?: boolean;
    }

    let {
        newTabOpen = false,
        searchBookmarks: searchBookmarksEnabled = true,
        searchHistory: searchHistoryEnabled = true,
    }: Props = $props();

    interface SearchItem {
        id: string;
        type: ItemType;
        title: string;
        url?: string;
        folderPath?: string;
        iconUrl?: string;
    }
    const defaultEngines = buildDefaultEngines();

    const ENGINE_CATEGORY_KEY = "nt_engine_category";

    function readSelectedCategoryId(): string | null {
        if (typeof localStorage === "undefined") return null;
        const value = localStorage.getItem(ENGINE_CATEGORY_KEY);
        return value ? value : null;
    }

    function persistSelectedCategoryId(categoryId: string) {
        if (typeof localStorage === "undefined") return;
        localStorage.setItem(ENGINE_CATEGORY_KEY, categoryId);
    }

    let engineCategories: EngineCategoryItem[] = $state([]);
    let selectedCategoryId = $state(readSelectedCategoryId() ?? "1");
    let enginesGroup: TabItem[] = $state([]);
    let enabledEngines: Engine[] = $state([]);
    let disabledEngines: Engine[] = $state([]);
    let bookmarksResults: SearchItem[] = $state([]);
    let historyResults: SearchItem[] = $state([]);
    let historyLoading = $state(false);

    let searchEl: HTMLInputElement | undefined = $state();
    let engineEls: HTMLDivElement | undefined = $state();
    let listEls: HTMLDivElement | undefined = $state();
    let inputValue: string = $state("");
    let showMoreEngines = $state(false);
    let searchSeq = $state(0);
    let historySeq = $state(0);
    let bookmarksDebounceId: ReturnType<typeof setTimeout> | null = null;
    let historyDebounceId: ReturnType<typeof setTimeout> | null = null;
    let bookmarksLoading = $state(false);
    let suppressNextEnter = $state(false);
    let searchAreaFocused = $state(false);
    let lastSearchScope = $state<string | null>(null);

    const SEARCH_DEBOUNCE_MS = 200;
    let isComposing = $state(false);
    function getFallbackCategoryId() {
        return engineCategories[0]?.id ?? "1";
    }

    function normalizeEngineCategoryId(category?: string): EngineCategory {
        const normalized = category?.trim();
        if (
            normalized &&
            engineCategories.some((item) => item.id === normalized)
        ) {
            return normalized;
        }
        return getFallbackCategoryId();
    }

    let displayEnabledEngines = $derived(
        !selectedCategoryId
            ? enabledEngines
            : enabledEngines.filter(
                  (engine) =>
                      normalizeEngineCategoryId(engine.category) ===
                      selectedCategoryId,
              ),
    );
    let displayDisabledEngines = $derived(
        !selectedCategoryId
            ? disabledEngines
            : disabledEngines.filter(
                  (engine) =>
                      normalizeEngineCategoryId(engine.category) ===
                      selectedCategoryId,
              ),
    );
    let displayPlaceholderEngineTitle = $derived(
        displayEnabledEngines[0]?.title,
    );

    function openSearchEngineSettings() {
        if (typeof window === "undefined") return;
        const categoryId = selectedCategoryId || getFallbackCategoryId();
        window.dispatchEvent(
            new CustomEvent("open-settings-search-engines", {
                detail: { categoryId },
            }),
        );
    }

    function syncEnginesGroupTabs() {
        enginesGroup = engineCategories.map((item) => ({
            key: item.id,
            name: item.name,
            sel: item.id === selectedCategoryId,
        }));
    }

    async function loadEngineCategoriesFromDb() {
        await ensureDefaultEngineCategories(buildDefaultEngineCategories());
        const categories = await getEngineCategories();
        const visibleCategories = categories.filter(
            (item) => item.id !== FALLBACK_ENGINE_CATEGORY_ID,
        );
        engineCategories = visibleCategories.length
            ? visibleCategories
            : categories;
        if (!engineCategories.length) {
            selectedCategoryId = "1";
            enginesGroup = [];
            return;
        }
        if (!engineCategories.some((item) => item.id === selectedCategoryId)) {
            selectedCategoryId = engineCategories[0].id;
        }
        persistSelectedCategoryId(selectedCategoryId);
        syncEnginesGroupTabs();
    }

    async function loadEnabledEnginesFromDb() {
        const enabled = await getEnabledEngines();
        enabledEngines = enabled.map((e) => ({ ...e, enabled: true }));
    }

    async function loadDisabledEnginesFromDb() {
        const disabled = await getDisabledEngines();
        disabledEngines = disabled.map((e) => ({ ...e, enabled: false }));
    }

    async function refreshEngineConfig() {
        await loadEngineCategoriesFromDb();
        await loadEnabledEnginesFromDb();
        if (showMoreEngines) {
            await loadDisabledEnginesFromDb();
        }
    }

    onMount(() => {
        const handleEngineConfigUpdated = () => {
            void refreshEngineConfig();
        };
        window.addEventListener(
            "engine-config-updated",
            handleEngineConfigUpdated,
        );

        void (async () => {
            await ensureDefaultEngines(defaultEngines); //初始化把数据添加到Engines表里，有就不会添加
            await refreshEngineConfig();
            inputValue = backPageInitInputValue();
        })();

        return () => {
            window.removeEventListener(
                "engine-config-updated",
                handleEngineConfigUpdated,
            );
        };
    });

    function clickEngineGroup(tab: TabItem) {
        selectedCategoryId = tab.key;
        persistSelectedCategoryId(selectedCategoryId);
        syncEnginesGroupTabs();
    }

    $effect(() => {
        const scope = `${searchBookmarksEnabled}-${searchHistoryEnabled}`;
        if (lastSearchScope === null) {
            lastSearchScope = scope;
            return;
        }
        if (lastSearchScope === scope) return;
        lastSearchScope = scope;

        const currentInput = searchEl?.value ?? inputValue;
        if (!currentInput) {
            bookmarksResults = [];
            historyResults = [];
            bookmarksLoading = false;
            historyLoading = false;
            return;
        }
        void searchInput(currentInput);
    });

    function backPageInitInputValue(): string {
        if (!searchEl) return "";
        return searchEl.value;
    }

    function mergeEnabledFromZone(zoneItems: Engine[]): Engine[] {
        const zoneResult = zoneItems.map((item) => ({
            ...item,
            enabled: true,
        }));

        if (engineCategories.length <= 1) {
            return zoneResult;
        }

        const otherEnabled = enabledEngines.filter(
            (e) => normalizeEngineCategoryId(e.category) !== selectedCategoryId,
        );

        return [...otherEnabled, ...zoneResult];
    }

    function handleConsiderEnabled(e: CustomEvent<DndEvent<Engine>>) {
        enabledEngines = mergeEnabledFromZone(e.detail.items);
    }

    function handleConsiderDisabled(e: CustomEvent<DndEvent<Engine>>) {
        disabledEngines = e.detail.items.map((item) => ({
            ...item,
            enabled: false,
        }));
    }

    async function persistEnginesState() {
        const enabledWithIds = enabledEngines.filter(
            (i): i is Engine & { id: number } => !!i.id,
        );
        const disabledWithIds = disabledEngines.filter(
            (i): i is Engine & { id: number } => !!i.id,
        );
        if (enabledWithIds.length || disabledWithIds.length) {
            await updateEnginesState(enabledWithIds, disabledWithIds);
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("engine-config-updated"));
            }
        }
    }

    async function handleFinalizeEnabled(e: CustomEvent<DndEvent<Engine>>) {
        enabledEngines = mergeEnabledFromZone(e.detail.items);
        await persistEnginesState();
    }

    async function handleFinalizeDisabled(e: CustomEvent<DndEvent<Engine>>) {
        disabledEngines = e.detail.items.map((item) => ({
            ...item,
            enabled: false,
        }));
        await persistEnginesState();
    }

    async function searchInput(value: string) {
        if (isComposing) return;
        if (!value) {
            searchSeq += 1;
            historySeq += 1;
            if (bookmarksDebounceId) {
                clearTimeout(bookmarksDebounceId);
                bookmarksDebounceId = null;
            }
            if (historyDebounceId) {
                clearTimeout(historyDebounceId);
                historyDebounceId = null;
            }
            bookmarksResults = [];
            historyResults = [];
            bookmarksLoading = false;
            historyLoading = false;
            listEls?.scrollTo({ top: 0 });
            return;
        }
        const seq = ++searchSeq;
        const hSeq = ++historySeq;
        listEls?.scrollTo({ top: 0 });
        if (bookmarksDebounceId) {
            clearTimeout(bookmarksDebounceId);
            bookmarksDebounceId = null;
        }
        if (searchBookmarksEnabled) {
            bookmarksLoading = true;
            const bookmarkQuery = value;
            bookmarksDebounceId = setTimeout(async () => {
                if (seq !== searchSeq) return;
                try {
                    const results = await searchBookmarks(bookmarkQuery, 200);
                    if (seq !== searchSeq) return;
                    bookmarksResults = sortResults(
                        results
                            .filter((item) => !!item.url)
                            .map((item) => ({
                                id: item.id,
                                type: "other" as BookmarkSubType,
                                title: getDisplayTitle(item.title, item.url),
                                url: item.url,
                            })),
                        bookmarkQuery,
                    );
                } catch {
                    if (seq !== searchSeq) return;
                    bookmarksResults = [];
                } finally {
                    if (seq === searchSeq) bookmarksLoading = false;
                }
            }, SEARCH_DEBOUNCE_MS);
        } else {
            bookmarksResults = [];
            bookmarksLoading = false;
        }

        if (historyDebounceId) {
            clearTimeout(historyDebounceId);
            historyDebounceId = null;
        }
        if (searchHistoryEnabled) {
            historyLoading = true;
            const query = value;
            historyDebounceId = setTimeout(async () => {
                if (hSeq !== historySeq) return;
                try {
                    const results = await searchHistory(query);
                    if (hSeq !== historySeq) return;
                    historyResults = sortResults(
                        mapHistoryResults(results),
                        query,
                    );
                } catch {
                    if (hSeq !== historySeq) return;
                    historyResults = [];
                } finally {
                    if (hSeq === historySeq) historyLoading = false;
                }
            }, SEARCH_DEBOUNCE_MS);
        } else {
            historyResults = [];
            historyLoading = false;
        }
    }

    function inputKey(e: KeyboardEvent) {
        const key = e.key;
        if (isComposing || e.isComposing) return;
        if (suppressNextEnter && key === "Enter") {
            suppressNextEnter = false;
            return;
        }
        if (suppressNextEnter && key !== "Enter") {
            suppressNextEnter = false;
        }
        if (key === "ArrowUp") {
            return;
        }
        if (key === "ArrowDown") {
            if (!bookmarksResults.length && !historyResults.length) return;
            e.preventDefault();
            const [first] = getResultEls();
            if (first) {
                first.focus();
                first.scrollIntoView({ block: "nearest" });
            }
            return;
        }
        if (key === "Enter") {
            e.preventDefault();
            const active = document.activeElement as HTMLElement | null;
            if (active && listEls?.contains(active)) {
                (active as HTMLAnchorElement).click();
                return;
            }
            const firstContainer = engineEls?.children[0] as
                | HTMLElement
                | undefined;
            const firstLink = firstContainer?.querySelector(
                "a.engine",
            ) as HTMLAnchorElement | null;
            const target = firstLink ?? firstContainer;
            target?.focus();
            target?.click();
        }
    }

    function handleResultKeydown(e: KeyboardEvent) {
        const items = getResultEls();
        const current = e.currentTarget as HTMLElement;
        const index = items.indexOf(current);
        if (index === -1) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            const next = items[index + 1];
            if (next) {
                next.focus();
                next.scrollIntoView({ block: "nearest" });
            }
        }
        if (e.key === "ArrowUp") {
            e.preventDefault();
            const prev = items[index - 1];
            if (prev) {
                prev.focus();
                prev.scrollIntoView({ block: "nearest" });
            } else {
                searchEl?.focus();
            }
        }
    }

    async function clickEditeEngines() {
        showMoreEngines = !showMoreEngines;
        await refreshEngineConfig();
    }

    function getResultEls() {
        if (!listEls) return [] as HTMLElement[];
        return Array.from(
            listEls.querySelectorAll<HTMLElement>("[data-result='true']"),
        );
    }

    function handleInputFocus() {
        searchAreaFocused = true;
    }

    function handleInputBlur(e: FocusEvent) {
        const next = e.relatedTarget as Node | null;
        if (next && listEls?.contains(next)) return;
        searchAreaFocused = false;
    }

    function handleListFocusOut(e: FocusEvent) {
        const next = e.relatedTarget as Node | null;
        if (next === searchEl) return;
        if (next && listEls?.contains(next)) return;
        searchAreaFocused = false;
    }

    function mapHistoryResults(items: HistoryItem[]): SearchItem[] {
        return items
            .filter((item) => !!item.url)
            .map((item) => ({
                id: String(item.id ?? item.url ?? item.lastVisitTime ?? ""),
                type: "history" as const,
                title: getDisplayTitle(item.title, item.url),
                url: item.url,
            }));
    }

    function getDisplayTitle(title?: string | null, url?: string | null) {
        const trimmed = title?.trim();
        if (trimmed) return trimmed;
        return url ?? t("nt_unnamed");
    }

    function sortResults(items: SearchItem[], query: string) {
        const needle = query.trim().toLowerCase();
        if (!needle) return items;
        const score = (item: SearchItem) => {
            const title = item.title.toLowerCase();
            const url = item.url?.toLowerCase() ?? "";
            if (title.startsWith(needle)) return 3;
            if (title.includes(needle)) return 2;
            if (url.includes(needle)) return 1;
            return 0;
        };
        return [...items].sort((a, b) => score(b) - score(a));
    }
</script>

<div class="search" class:hided_tab={enginesGroup.length <= 1}>
    {#if enginesGroup.length > 1}
        <Tab
            tabs={enginesGroup}
            onclick={clickEngineGroup}
            selectedBg={false}
        />
    {/if}
    <div
        class="search_g"
        class:bg={searchAreaFocused &&
            ((searchBookmarksEnabled &&
                (bookmarksResults.length || bookmarksLoading)) ||
                (searchHistoryEnabled &&
                    (historyResults.length || historyLoading)))}
        class:top0={enginesGroup.length <= 1}
    >
        {@render temInputGroup()}
        {#if searchAreaFocused && ((searchBookmarksEnabled && (bookmarksResults.length || bookmarksLoading)) || (searchHistoryEnabled && (historyResults.length || historyLoading)))}
            <div
                class="list"
                bind:this={listEls}
                onfocusout={handleListFocusOut}
                transition:slide={{ duration: 200 }}
            >
                {#if searchBookmarksEnabled && bookmarksResults.length}
                    <G>
                        <T type="s">{t("nt_label_bookmarks")}</T>
                    </G>
                    {#each bookmarksResults as bookmark}
                        {@render temBkmk(bookmark)}
                    {/each}
                {/if}

                {#if searchHistoryEnabled && historyResults.length}
                    <G>
                        <T type="s">{t("nt_label_history")}</T>
                    </G>
                    {#each historyResults as history}
                        {@render temBkmk(history)}
                    {/each}
                {/if}

                {#if (searchHistoryEnabled && historyLoading) || (searchBookmarksEnabled && bookmarksLoading)}
                    <div class="more_trigger">
                        <Icon name="Loading" color="var(--c-text)" />
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>

{#snippet temInputGroup()}
    <div class="input_group_border">
        <div class="input_group">
            {#if !showMoreEngines}
                <div class="input_box">
                    <!-- svelte-ignore a11y_autofocus -->
                    <input
                        name="Search"
                        class="input"
                        bind:this={searchEl}
                        bind:value={inputValue}
                        type="search"
                        placeholder={displayPlaceholderEngineTitle
                            ? t(
                                  "nt_search_placeholder",
                                  displayPlaceholderEngineTitle,
                              )
                            : t("nt_search_placeholder_fallback")}
                        oncompositionstart={() => (isComposing = true)}
                        oncompositionend={(e) => {
                            isComposing = false;
                            suppressNextEnter = true;
                            searchInput(
                                (e.currentTarget as HTMLInputElement).value,
                            );
                        }}
                        onfocus={handleInputFocus}
                        onblur={handleInputBlur}
                        oninput={() => searchInput(inputValue)}
                        onkeyup={inputKey}
                        autofocus
                    />
                    {#if inputValue.length}
                        <Button
                            onclick={() => {
                                inputValue = "";
                                searchInput("");
                            }}
                        >
                            <G>
                                <Icon
                                    name="X"
                                    color="var(--c-text)"
                                    opacity={0.4}
                                    size={16}
                                />
                            </G>
                        </Button>
                    {/if}
                </div>
            {/if}
            {@render temEngines()}
        </div>
    </div>
    {#if showMoreEngines}
        {@render temMoreEngines()}
    {/if}
{/snippet}

{#snippet temEngines()}
    <div class="engines_M" class:w100={showMoreEngines}>
        <div
            bind:this={engineEls}
            class="engines"
            class:drag={showMoreEngines}
            data-dnd-hint={t("nt_drag_to_enable_sortable")}
            use:dndzone={{
                items: displayEnabledEngines,
                flipDurationMs: 200,
                type: "engines",
                zoneTabIndex: -1,
                dropTargetStyle: {},
            }}
            onconsider={handleConsiderEnabled}
            onfinalize={handleFinalizeEnabled}
        >
            {#each displayEnabledEngines as engine (engine.id)}
                <a
                    class="engine"
                    href={engine.engineUrl?.replace("%s", inputValue)}
                    target={newTabOpen ? "_blank" : "_self"}
                    rel={newTabOpen ? "noreferrer" : undefined}
                    animate:flip={{ duration: 200 }}
                >
                    <EngineIcon
                        alt={engine.title ?? ""}
                        engineUrl={engine.engineUrl}
                    />
                </a>
            {/each}
        </div>
        <Button onclick={clickEditeEngines}>
            <G>
                <Icon
                    name={showMoreEngines ? "X" : "Plus"}
                    color="var(--c-text)"
                    opacity={0.6}
                />
            </G>
        </Button>
    </div>
{/snippet}

{#snippet temMoreEngines()}
    <div class="more_engines_M" transition:slide={{ duration: 200 }}>
        <div
            class="more_g"
            class:drag={showMoreEngines}
            data-dnd-hint={t("nt_drag_to_disable")}
            use:dndzone={{
                items: displayDisabledEngines,
                flipDurationMs: 200,
                type: "engines",
                zoneTabIndex: -1,
                dropTargetStyle: {},
            }}
            onconsider={handleConsiderDisabled}
            onfinalize={handleFinalizeDisabled}
        >
            {#each displayDisabledEngines as engine (engine.id)}
                <button
                    class="more_item"
                    class:more_item_sel={engine.enabled}
                    animate:flip={{ duration: 200 }}
                >
                    <EngineIcon
                        alt={engine.title ?? ""}
                        engineUrl={engine.engineUrl}
                    />
                </button>
            {/each}
        </div>
        <Button onclick={openSearchEngineSettings}>
            <G>
                <Icon name="SquarePen" color="var(--c-text)" opacity={0.6} />
            </G>
        </Button>
    </div>
{/snippet}

{#snippet temBkmk(bookmark: SearchItem)}
    <a
        class="item"
        href={bookmark.url}
        target={newTabOpen ? "_blank" : "_self"}
        rel={newTabOpen ? "noreferrer" : undefined}
        onkeydown={handleResultKeydown}
        data-result="true"
    >
        <G>
            <BkmkIcon imgUrl={bookmark.url} alt={bookmark.title} size="s" />
        </G>
        <G vertical full>
            <T type="m" bold nowrap>{bookmark.title}</T>
        </G>
    </a>
{/snippet}

<style>
    .input::-webkit-search-cancel-button {
        -webkit-appearance: none;
        appearance: none;
        display: none;
    }

    .input::-moz-search-clear {
        display: none;
    }
    .search {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 600px;
        max-width: 100%;
        padding: var(--gap);
        position: relative;
        min-height: 120px;
    }
    .hided_tab {
        height: 60px;
    }

    .engines_M {
        display: flex;
        align-items: center;
        flex-direction: row;
        overflow-x: auto;
        overflow-y: hidden;
        flex: 0 0 auto;
        max-width: 300px;
    }
    .w100 {
        width: 100%;
        flex:none;
        max-width: none;
        box-sizing: border-box;
        justify-content: flex-end;
    }
    .w100 .engines{
        width: 100%;
    }
    .more_engines_M {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: var(--gap);
        width: 100%;
        box-sizing: border-box;
        background-color: var(--c-bg1);
        border-radius: var(--r1);
    }

    .more_item {
        display: flex;
        background-color: unset;
        border: none;
        padding: 0;
        border-radius: var(--r);
        filter: grayscale();
        align-items: center;
        overflow: hidden;
    }
    .more_item_sel {
        filter: grayscale(0);
    }
    .search_g {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        width: 100%;
        box-sizing: border-box;
        position: absolute;
        top: 45px;
        left: 0;
        z-index: 10;
        padding: var(--gap);
        border-radius: var(--r2);
    }
    .top0 {
        top: 0;
    }
    .bg {
        background-color: var(--c-bg1);
    }

    .list {
        display: flex;
        gap: var(--gap);
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
        padding: var(--gap);
        max-height: calc(100vh - 110px);
        overflow-y: auto;
    }
    .more_trigger {
        display: flex;
        justify-content: center;
        padding: var(--gap) 0;
    }

    .input_group_border {
        width: 100%;
        padding: 2px;
        box-sizing: border-box;
        border-radius: var(--r1);
        background: transparent;
    }

    .input_group_border:has(input:focus) {
        background: linear-gradient(0deg, var(--c-main), var(--c-main-1));
    }

    .input_group {
        display: flex;
        flex-direction: row;
        align-items: center;
        border-radius: calc(var(--r1) - 2px);
        padding: var(--gap);
        background-color: var(--c-bg1);
        width: 100%;
        box-sizing: border-box;
        justify-content: flex-end;
        gap: var(--gap);
    }
    .input_box {
        display: flex;
        align-items: center;
        width: 100%;
        box-sizing: border-box;
    }
    .input {
        color: var(--c-text);
        font-size: var(--f-size-m);
        background-color: unset;
        border: none;
        padding: var(--gap) calc(var(--gap) + var(--gap));
        width: 100%;
        min-width: 0;
        flex: 1 1 auto;
        height: 40px;
        caret-color: var(--c-green);
    }
    .input::selection {
        background-color: var(--c-green);
        color: var(--c-bg);
    }
    .input::placeholder {
        color: var(--c-text-2);
    }
    .input:focus {
        outline: none;
    }

    .more_g {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--gap);
        padding: var(--gap);
        border-radius: var(--r);
        min-height: 40px;
        width: 100%;
        box-sizing: border-box;
        flex-wrap: wrap;
        position: relative;
    }
    .more_g.drag::after {
        content: attr(data-dnd-hint);
        position: absolute;
        top: 0;
        left: 0;
        line-height: 30px;
        padding: var(--gap) calc(var(--gap) * 2);
        color: var(--c-text-2);
        font-size: var(--f-size-s);
        pointer-events: none;
    }

    .engines {
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-end;
        gap: var(--gap);
        padding: var(--gap);
        border-radius: var(--r);
        min-height: 40px;
        min-width: max-content;
        width: max-content;
        box-sizing: border-box;
        position: relative;
        flex-wrap: nowrap;
    }
    .engines.drag::after {
        content: attr(data-dnd-hint);
        position: absolute;
        top: 0;
        left: 0;
        line-height: 30px;
        padding: var(--gap) calc(var(--gap) * 2);
        color: var(--c-text-2);
        font-size: var(--f-size-s);
        pointer-events: none;
    }
    .drag {
        outline: 2px var(--c-mask) dashed;
    }
    .engine {
        display: flex;
        border-radius: calc(var(--r) / 2 + 2px);
        overflow: hidden;
        cursor: default !important;
        min-width: 30px;
        flex: 0 0 auto;
    }
    .engine:focus-visible {
        outline: 2px var(--c-text) solid;
    }

    .item {
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
        box-sizing: border-box;
        text-decoration: none;
        gap: var(--gap);
        padding: var(--gap);
        border-radius: var(--r);
        cursor: default;
    }
    .engine:active,
    .item:active {
        background-color: var(--c-mask);
    }
    .engine:focus,
    .item:focus {
        outline: 2px var(--c-text) solid;
    }
    a {
        text-decoration: none;
    }
</style>
