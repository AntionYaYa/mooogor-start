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
        searchBookmarks,
    } from "@/lib/browser/bookmarks";
    import { searchHistory } from "@/lib/browser/history";
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
    import {
        clearPersistedSelectedCategoryId,
        MAX_SEARCH_KEYS,
        normalizeSearchKey,
        persistSearchKeys,
        persistSelectedCategoryId,
        persistSelectedEngineUrl,
        readSearchKeys,
        readSelectedCategoryId,
        readSelectedEngineUrl,
    } from "@/lib/search/searchStorage";
    import {
        mapBookmarkResults,
        mapHistoryResults,
        sortResults,
        type SearchItem,
    } from "@/lib/search/searchResults";

    interface Props {
        newTabOpen?: boolean;
        searchBookmarks?: boolean;
        searchHistory?: boolean;
        rememberSearchEngineCategory?: boolean;
        settingsReady?: boolean;
    }

    let {
        newTabOpen = false,
        searchBookmarks: searchBookmarksEnabled = true,
        searchHistory: searchHistoryEnabled = true,
        rememberSearchEngineCategory = false,
        settingsReady = true,
    }: Props = $props();

    const defaultEngines = buildDefaultEngines();

    let engineCategories: EngineCategoryItem[] = $state([]);
    let selectedCategoryId = $state("1");
    let enginesGroup: TabItem[] = $state([]);
    let enabledEngines: Engine[] = $state([]);
    let disabledEngines: Engine[] = $state([]);
    let bookmarksResults: SearchItem[] = $state([]);
    let historyResults: SearchItem[] = $state([]);
    let historyLoading = $state(false);
    let searchKeys: string[] = $state(readSearchKeys());

    let searchEl: HTMLInputElement | undefined = $state();
    let engineEls: HTMLDivElement | undefined = $state();
    let listEls: HTMLDivElement | undefined = $state();
    let searchPanelEl: HTMLDivElement | undefined = $state();
    let inputValue: string = $state("");
    let showMoreEngines = $state(false);
    let searchSeq = $state(0);
    let historySeq = $state(0);
    let bookmarksDebounceId: ReturnType<typeof setTimeout> | null = null;
    let historyDebounceId: ReturnType<typeof setTimeout> | null = null;
    let bookmarksLoading = $state(false);
    let selectedEngineUrl = $state("");
    let selectedEngineCategoryId = $state("");
    let searchAreaFocused = $state(false);
    let lastSearchScope = $state<string | null>(null);
    let engineConfigReady = $state(false);
    let syncedRememberedCategory = $state(false);
    let showSearchKeys = $derived(
        !showMoreEngines &&
            searchAreaFocused &&
            !inputValue.trim() &&
            !bookmarksResults.length &&
            !historyResults.length &&
            !bookmarksLoading &&
            !historyLoading &&
            searchKeys.length > 0,
    );

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
        getSelectedEngine()?.title ?? displayEnabledEngines[0]?.title,
    );

    $effect(() => {
        const categoryId = selectedCategoryId || "all";
        if (!displayEnabledEngines.length) {
            selectedEngineUrl = "";
            selectedEngineCategoryId = categoryId;
            return;
        }
        const savedEngineUrl = readSelectedEngineUrl(categoryId);
        const savedEngine = displayEnabledEngines.find(
            (engine) => engine.engineUrl === savedEngineUrl,
        );
        if (selectedEngineCategoryId !== categoryId) {
            selectedEngineCategoryId = categoryId;
            selectedEngineUrl =
                savedEngine?.engineUrl ??
                displayEnabledEngines[0]?.engineUrl ??
                "";
            return;
        }
        if (
            selectedEngineUrl &&
            displayEnabledEngines.some(
                (engine) => engine.engineUrl === selectedEngineUrl,
            )
        ) {
            return;
        }
        selectedEngineUrl =
            savedEngine?.engineUrl ?? displayEnabledEngines[0]?.engineUrl ?? "";
    });

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
        if (settingsReady) {
            if (rememberSearchEngineCategory) {
                persistSelectedCategoryId(selectedCategoryId);
            } else {
                clearPersistedSelectedCategoryId();
            }
        }
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
            engineConfigReady = true;
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
        if (rememberSearchEngineCategory) {
            persistSelectedCategoryId(selectedCategoryId);
        }
        syncEnginesGroupTabs();
    }

    $effect(() => {
        if (!settingsReady) return;
        if (rememberSearchEngineCategory) {
            if (!syncedRememberedCategory) {
                syncedRememberedCategory = true;
                const rememberedCategoryId = readSelectedCategoryId();
                if (
                    rememberedCategoryId &&
                    rememberedCategoryId !== selectedCategoryId
                ) {
                    selectedCategoryId = rememberedCategoryId;
                    syncEnginesGroupTabs();
                    return;
                }
            }
            if (
                engineCategories.length &&
                !engineCategories.some((item) => item.id === selectedCategoryId)
            ) {
                selectedCategoryId = engineCategories[0].id;
            }
            persistSelectedCategoryId(selectedCategoryId);
            syncEnginesGroupTabs();
            return;
        }
        syncedRememberedCategory = false;
        clearPersistedSelectedCategoryId();
    });

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

    function mergeDisabledFromZone(zoneItems: Engine[]): Engine[] {
        const zoneResult = zoneItems.map((item) => ({
            ...item,
            enabled: false,
        }));

        if (engineCategories.length <= 1) {
            return zoneResult;
        }

        const otherDisabled = disabledEngines.filter(
            (e) => normalizeEngineCategoryId(e.category) !== selectedCategoryId,
        );

        return [...otherDisabled, ...zoneResult];
    }

    function getZoneItemIds(zoneItems: Engine[]) {
        return new Set(
            zoneItems
                .map((item) => item.id)
                .filter((id): id is number => typeof id === "number"),
        );
    }

    function syncFromEnabledZone(zoneItems: Engine[]) {
        const zoneIds = getZoneItemIds(zoneItems);
        enabledEngines = mergeEnabledFromZone(zoneItems);
        if (!zoneIds.size) return;
        disabledEngines = disabledEngines.filter(
            (item) => !item.id || !zoneIds.has(item.id),
        );
    }

    function syncFromDisabledZone(zoneItems: Engine[]) {
        const zoneIds = getZoneItemIds(zoneItems);
        disabledEngines = mergeDisabledFromZone(zoneItems);
        if (!zoneIds.size) return;
        enabledEngines = enabledEngines.filter(
            (item) => !item.id || !zoneIds.has(item.id),
        );
    }

    async function persistEnginesState() {
        const enabledWithIds = enabledEngines.filter(
            (i): i is Engine & { id: number } => !!i.id,
        );
        const enabledIds = new Set(enabledWithIds.map((item) => item.id));
        const disabledWithIds = disabledEngines.filter(
            (i): i is Engine & { id: number } =>
                !!i.id && !enabledIds.has(i.id),
        );
        if (enabledWithIds.length || disabledWithIds.length) {
            await updateEnginesState(enabledWithIds, disabledWithIds);
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("engine-config-updated"));
            }
        }
    }

    function handleConsiderEnabled(e: CustomEvent<DndEvent<Engine>>) {
        syncFromEnabledZone(e.detail.items);
    }

    function handleConsiderDisabled(e: CustomEvent<DndEvent<Engine>>) {
        syncFromDisabledZone(e.detail.items);
    }

    async function handleFinalizeEnabled(e: CustomEvent<DndEvent<Engine>>) {
        syncFromEnabledZone(e.detail.items);
        await persistEnginesState();
    }

    async function handleFinalizeDisabled(e: CustomEvent<DndEvent<Engine>>) {
        syncFromDisabledZone(e.detail.items);
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
                        mapBookmarkResults(results, t("nt_unnamed")),
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
                        mapHistoryResults(results, t("nt_unnamed")),
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

    function saveSearchKey(value: string) {
        const next = normalizeSearchKey(value);
        if (!next) return;
        searchKeys = [
            next,
            ...searchKeys.filter((item) => item !== next),
        ].slice(0, MAX_SEARCH_KEYS);
        persistSearchKeys(searchKeys);
    }

    function removeSearchKey(value: string) {
        searchKeys = searchKeys.filter((item) => item !== value);
        persistSearchKeys(searchKeys);
    }

    function fillSearchKey(value: string) {
        inputValue = value;
        searchEl?.focus();
        void searchInput(value);
    }

    function submitSearch() {
        const keyword = normalizeSearchKey(inputValue);
        if (!keyword) return;
        saveSearchKey(keyword);
    }

    function getSelectedEngine() {
        return (
            displayEnabledEngines.find(
                (engine) => engine.engineUrl === selectedEngineUrl,
            ) ?? displayEnabledEngines[0]
        );
    }

    function selectEngine(engine: Engine) {
        const categoryId = selectedCategoryId || "all";
        selectedEngineUrl = engine.engineUrl;
        selectedEngineCategoryId = categoryId;
        persistSelectedEngineUrl(engine.engineUrl, categoryId);
    }

    function getEngineLink(engineUrl: string) {
        if (!engineEls) return null;
        return engineEls.querySelector<HTMLAnchorElement>(
            `.engine[data-engine-url="${CSS.escape(engineUrl)}"]`,
        );
    }

    function getSelectedEngineLink() {
        return selectedEngineUrl ? getEngineLink(selectedEngineUrl) : null;
    }

    function getEngineSearchUrl(engine: Engine) {
        return engine.engineUrl.replace(
            "%s",
            encodeURIComponent(normalizeSearchKey(inputValue)),
        );
    }

    function openEngineSearch(engine: Engine) {
        const keyword = normalizeSearchKey(inputValue);
        if (!keyword) {
            searchEl?.focus();
            return;
        }
        selectEngine(engine);
        saveSearchKey(keyword);
        const url = getEngineSearchUrl(engine);
        if (newTabOpen) {
            window.open(url, "_blank", "noreferrer");
            return;
        }
        window.location.href = url;
    }

    function handleEngineClick(event: MouseEvent, engine: Engine) {
        selectEngine(engine);
        const keyword = normalizeSearchKey(inputValue);
        if (!keyword) {
            event.preventDefault();
            searchEl?.focus();
            return;
        }
        submitSearch();
    }

    function inputKey(e: KeyboardEvent) {
        const key = e.key;
        if (isComposing || e.isComposing) return;
        if (key === "ArrowUp") {
            return;
        }
        if (key === "ArrowDown") {
            if (!bookmarksResults.length && !historyResults.length) return;
            e.preventDefault();
            e.stopPropagation();
            const [first] = getResultEls();
            if (first) {
                first.focus();
                first.scrollIntoView({ block: "nearest" });
            }
            return;
        }
        if (key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            const engine = getSelectedEngine();
            if (!engine) return;
            if (e.shiftKey) {
                openEngineSearch(engine);
                return;
            }
            getSelectedEngineLink()?.focus();
        }
    }

    function handleEngineKeydown(e: KeyboardEvent, engine: Engine) {
        if (e.key === "Enter") {
            e.stopPropagation();
            return;
        }
        if (e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            openEngineSearch(engine);
            return;
        }
        if (e.key === "Backspace") {
            e.preventDefault();
            e.stopPropagation();
            searchEl?.focus();
            return;
        }
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

        e.preventDefault();
        e.stopPropagation();
        const index = displayEnabledEngines.findIndex(
            (item) => item.engineUrl === engine.engineUrl,
        );
        const nextIndex =
            e.key === "ArrowLeft"
                ? (index - 1 + displayEnabledEngines.length) %
                  displayEnabledEngines.length
                : (index + 1) % displayEnabledEngines.length;
        const nextEngine = displayEnabledEngines[nextIndex];
        if (!nextEngine) return;
        selectEngine(nextEngine);
        getEngineLink(nextEngine.engineUrl)?.focus();
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
        if (next && searchPanelEl?.contains(next)) return;
        searchAreaFocused = false;
    }

    function handleListFocusOut(e: FocusEvent) {
        const next = e.relatedTarget as Node | null;
        if (next === searchEl) return;
        if (next && searchPanelEl?.contains(next)) return;
        searchAreaFocused = false;
    }

</script>

<div class="search" class:hided_tab={enginesGroup.length <= 1}>
    {#if engineConfigReady && enginesGroup.length > 1}
        <Tab
            tabs={enginesGroup}
            onclick={clickEngineGroup}
            selectedBg={false}
        />
    {/if}
    <div
        class="search_g"
        bind:this={searchPanelEl}
        class:search_g_hidden={!engineConfigReady}
        class:bg={showMoreEngines ||
            (searchAreaFocused &&
                (((searchBookmarksEnabled &&
                (bookmarksResults.length || bookmarksLoading)) ||
                (searchHistoryEnabled &&
                    (historyResults.length || historyLoading))) ||
                    showSearchKeys))}
        class:top0={enginesGroup.length <= 1}
    >
        {@render temInputGroup()}
        {#if !showMoreEngines && showSearchKeys}
            {@render temSearchKeys()}
        {/if}
        {#if !showMoreEngines && searchAreaFocused && ((searchBookmarksEnabled && (bookmarksResults.length || bookmarksLoading)) || (searchHistoryEnabled && (historyResults.length || historyLoading)))}
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
                            searchInput(
                                (e.currentTarget as HTMLInputElement).value,
                            );
                        }}
                        onfocus={handleInputFocus}
                        onblur={handleInputBlur}
                        oninput={() => searchInput(inputValue)}
                        onkeydown={inputKey}
                        autofocus
                    />
                    {#if inputValue.length}
                        <Button
                            onclick={() => {
                                inputValue = "";
                                searchInput("");
                                searchEl?.focus();
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

{#snippet temSearchKeys()}
    <div class="search_keys" transition:slide={{duration: 200}}>
        {#each searchKeys as key (key)}
            <div class="search_key">
                <button
                    type="button"
                    class="search_key_main"
                    onmousedown={(e) => e.preventDefault()}
                    onclick={() => fillSearchKey(key)}
                >
                    <T type="s" nowrap>{key}</T>
                </button>
                <button
                    type="button"
                    class="search_key_remove"
                    aria-label={`remove ${key}`}
                    onmousedown={(e) => e.preventDefault()}
                    onclick={() => removeSearchKey(key)}
                >
                    <Icon
                        name="X"
                        color="var(--c-text)"
                        opacity={0.5}
                        size={12}
                    />
                </button>
            </div>
        {/each}
    </div>
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
                zoneItemTabIndex: -1,
                dropTargetStyle: {},
            }}
            onconsider={handleConsiderEnabled}
            onfinalize={handleFinalizeEnabled}
        >
            {#each displayEnabledEngines as engine (engine.id)}
                <div class="engine_item" animate:flip={{ duration: 200 }}>
                    <a
                        class="engine"
                        class:selected={engine.engineUrl === selectedEngineUrl}
                        data-engine-url={engine.engineUrl}
                        href={getEngineSearchUrl(engine)}
                        draggable="false"
                        target={newTabOpen ? "_blank" : "_self"}
                        rel={newTabOpen ? "noreferrer" : undefined}
                        onclick={(event) => handleEngineClick(event, engine)}
                        onfocus={() => selectEngine(engine)}
                        onkeydown={(event) =>
                            handleEngineKeydown(event, engine)}
                    >
                        <EngineIcon
                            alt={engine.title ?? ""}
                            engineUrl={engine.engineUrl}
                            src={engine.faviconUrl}
                        />
                    </a>
                </div>
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
                zoneItemTabIndex: -1,
                dropTargetStyle: {},
            }}
            onconsider={handleConsiderDisabled}
            onfinalize={handleFinalizeDisabled}
        >
            {#each displayDisabledEngines as engine (engine.id)}
                <div class="engine_item" animate:flip={{ duration: 200 }}>
                    <div class="more_item" role="presentation">
                        <EngineIcon
                            alt={engine.title ?? ""}
                            engineUrl={engine.engineUrl}
                            src={engine.faviconUrl}
                        />
                    </div>
                </div>
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
    .search_keys {
        display: flex;
        flex-wrap: wrap;
        gap: var(--gap);
        width: 100%;
        box-sizing: border-box;
        padding:var(--gap);
    }
    .search_key {
        display: inline-flex;
        align-items: stretch;
        border-radius: 999px;
        background-color: var(--c-mask);
    }
    .search_key_main,
    .search_key_remove {
        border: none;
        background: transparent;
        color: var(--c-text);
    }
    .search_key_main {
        display: inline-flex;
        align-items: center;
        padding: var(--gap) var(--gap) var(--gap) calc(var(--gap) * 2);
        border-radius: 999px 0 0 999px;
    }
    .search_key_main:focus-visible,
    .search_key_remove:focus-visible {
        outline: solid 2px var(--c-text);
    }
    .search_key_main:active,
    .search_key_remove:active {
        background-color: var(--c-mask1);
    }
    .search_key_remove {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: var(--gap) calc(var(--gap) * 2) var(--gap) var(--gap);
        flex: 0 0 auto;
        border-radius: 0 999px 999px 0;
    }
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
        flex: 0 0 auto;
    }
    .w100 {
        width: 100%;
        flex: none;
        max-width: none;
        box-sizing: border-box;
        justify-content: flex-end;
    }
    .w100 .engines {
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
    .search_g_hidden {
        visibility: hidden;
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
        border: 2px var(--c-mask) dashed;
    }
    .engine_item {
        display: flex;
        flex: 0 0 auto;
    }
    .engine {
        display: flex;
        border-radius: calc(var(--r) / 2 + 2px);
        overflow: hidden;
        cursor: default !important;
        min-width: 30px;
        flex: 0 0 auto;
    }
    .engine:focus {
        outline: 2px var(--c-text) solid;
    }

    .engine.selected {
        outline: 2px var(--c-text-2) solid;
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
