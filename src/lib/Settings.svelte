<script lang="ts">
  import { onMount } from "svelte";
  import { flip } from "svelte/animate";
  import { dndzone } from "svelte-dnd-action";
  import type { DndEvent } from "svelte-dnd-action";
  import { fly, slide } from "svelte/transition";
  import G from "./components/G.svelte";
  import T from "./components/T.svelte";
  import Switch from "./components/Switch.svelte";
  import Select, { type SelectOption } from "./components/Select.svelte";
  import Divider from "./components/Divider.svelte";
  import EditSearchEngine from "./EditSearchEngine.svelte";
  import ManageEngineCategories from "./ManageEngineCategories.svelte";
  import type { OpenTab, UserSettings } from "@/lib/utils/settings";
  import type { Engine, EngineCategoryItem } from "@/lib/DB/DB";
  import {
    addEngine,
    deleteEngine,
    ensureDefaultEngineCategories,
    getEnabledEngines,
    getEngineCategories,
    getDisabledEngines,
    renameEngineCategory,
    addEngineCategory,
    deleteEngineCategory,
    updateEnginesLayout,
    updateEngineCategoriesOrder,
    updateEngine,
    resetSearchEnginesToDefault,
  } from "@/lib/DB/DB";
  import { buildDefaultEngines } from "@/lib/DB/defaultEnginesFactory";
  import { t } from "@/lib/utils/i18n";
  import Icon from "./components/Icon.svelte";
  import Button from "./components/Button.svelte";
  import EngineIcon from "./EngineIcon.svelte";
  type OpenSearchEnginesRequest = { id: number; categoryId?: string | null };
  interface Props {
    children: any;
    showSetting: boolean;
    userSettings: UserSettings;
    onchangeUserSettings: (userSettings: UserSettings) => void;
    onclickAbout: () => void;
    onclickSupport: () => void;
    onOpenTab: (tab: OpenTab) => void | Promise<void>;
    currentTabPinned?: boolean;
    openSearchEnginesRequest?: OpenSearchEnginesRequest | null;
  }
  let {
    children,
    showSetting,
    userSettings,
    onchangeUserSettings,
    onclickAbout,
    onclickSupport,
    onOpenTab,
    currentTabPinned = false,
    openSearchEnginesRequest = null,
  }: Props = $props();

  const openPosBase = [
    { label: t("nt_default_common"), value: "common" },
    { label: t("nt_default_bookmark"), value: "bookmark" },
    { label: t("nt_default_history"), value: "history" },
    { label: t("nt_default_last"), value: "last", dividerTop: true },
  ] as const;

  const languageBase = [
    { label: t("nt_lang_auto"), value: "auto" },
    { label: "简体中文", value: "zh_CN" ,dividerTop: true},
    { label: "繁體中文", value: "zh_TW" },
    { label: "English", value: "en" },
  ] as const;

  let openPosOptions = $derived(
    openPosBase.map((o) => ({
      ...o,
      sel: o.value === userSettings.defaultOpen,
    })),
  );

  let languageOptions = $derived(
    languageBase.map((o) => ({
      ...o,
      sel: o.value === userSettings.language,
    })),
  );

  let effectiveNewTabOpenSwitch = $derived(
    userSettings.newTabOpen || currentTabPinned,
  );
  let lockNewTabOpenSwitch = $derived(currentTabPinned);
  type SettingsPage =
    | "root"
    | "searchScope"
    | "searchEngines"
    | "common"
    | "bookmarks"
    | "history"
    | "other";
  let settingPage = $state<SettingsPage>("root");
  let pageDirection = $state<1 | -1>(1);
  type CategoryId = string;
  let settingEnabledEngines: Engine[] = $state([]);
  let settingDisabledEngines: Engine[] = $state([]);
  let settingEngineCategories: EngineCategoryItem[] = $state([]);
  let settingEngineGroups: Record<CategoryId, Engine[]> = $state({});
  let settingEnginesLoading = $state(false);
  let settingEnginesLoaded = $state(false);
  let settingEnginesSaving = $state(false);
  let expandedCategoryIds = $state<Set<string>>(new Set());
  let pendingExpandCategoryId = $state<string | null>(null);
  let lastOpenSearchEnginesRequestId = $state(0);
  let showCategoryManager = $state(false);
  let showSearchEngineEditor = $state(false);
  let editingSearchEngine: Engine | null = $state(null);
  let persistEngineLayoutTimer: ReturnType<typeof setTimeout> | null =
    $state(null);

  function openSettingPage(page: Exclude<SettingsPage, "root">) {
    pageDirection = 1;
    settingPage = page;
    if (page === "searchEngines") {
      void loadSearchSettingEngines(true);
    }
  }

  function goBackSettingPage() {
    pageDirection = -1;
    settingPage = "root";
  }

  function getSettingPageTitle() {
    if (settingPage === "searchScope") return t("nt_settings_search_scope");
    if (settingPage === "searchEngines") {
      return t("nt_settings_search_engines_title");
    }
    if (settingPage === "common") return t("nt_tab_common");
    if (settingPage === "bookmarks") return t("nt_tab_bookmarks");
    if (settingPage === "history") return t("nt_tab_history");
    if (settingPage === "other") return t("nt_settings_other_title");
    return t("nt_settings_title");
  }

  function buildDefaultEngineCategories() {
    return [
      { id: "1", name: t("nt_engine_category_all") },
      { id: "2", name: t("nt_engine_category_image") },
      { id: "3", name: t("nt_engine_category_video") },
      { id: "4", name: t("nt_engine_category_icon") },
      { id: "5", name: t("nt_engine_category_font") },
      { id: "6", name: t("nt_engine_category_music") },
    ];
  }

  function getFallbackCategoryId(): CategoryId {
    return settingEngineCategories[0]?.id ?? "1";
  }

  function normalizeEngineCategory(category?: string): CategoryId {
    return category?.trim() || getFallbackCategoryId();
  }

  function resolveSearchEngineCategoryId(categoryId?: string | null) {
    if (!settingEngineCategories.length) return null;
    if (categoryId) {
      const exists = settingEngineCategories.some(
        (category) => category.id === categoryId,
      );
      if (exists) return categoryId;
    }
    return settingEngineCategories[0]?.id ?? null;
  }

  function applyPendingCategoryExpansion() {
    if (!pendingExpandCategoryId) return;
    const resolvedId = resolveSearchEngineCategoryId(pendingExpandCategoryId);
    pendingExpandCategoryId = null;
    if (!resolvedId) return;
    expandedCategoryIds = new Set([resolvedId]);
  }

  function notifyEngineConfigUpdated() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("engine-config-updated"));
  }

  function handleEngineConfigUpdated() {
    if (!showSetting) return;
    if (settingPage !== "searchEngines") return;
    void loadSearchSettingEngines(true);
  }

  function setOpenPos(value: string) {
    onchangeUserSettings({
      ...userSettings,
      defaultOpen: value as UserSettings["defaultOpen"],
    });
  }

  function setLanguage(value: string) {
    onchangeUserSettings({
      ...userSettings,
      language: value as UserSettings["language"],
    });
  }

  function setNewTabOpen(value: boolean) {
    onchangeUserSettings({ ...userSettings, newTabOpen: value });
  }

  function setSearchBookmarks(value: boolean) {
    onchangeUserSettings({ ...userSettings, searchBookmarks: value });
  }

  function setSearchHistory(value: boolean) {
    onchangeUserSettings({ ...userSettings, searchHistory: value });
  }

  function onswitchNewTabOpen(swith: boolean) {
    if (lockNewTabOpenSwitch) return;
    setNewTabOpen(swith);
  }

  function openFeatureTab(tab: OpenTab) {
    void onOpenTab(tab);
  }

  function getSearchEngineCategoryOptions(): SelectOption[] {
    return settingEngineCategories.map((item) => ({
      label: item.name,
      value: item.id,
      sel: false,
    }));
  }

  function sortSearchEngines(items: Engine[]) {
    return [...items].sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) -
        (b.order ?? Number.MAX_SAFE_INTEGER),
    );
  }

  function buildSearchEngineGroups(
    allEngines: Engine[] = getAllSearchSettingEngines(),
  ) {
    const grouped = Object.fromEntries(
      settingEngineCategories.map((category) => [category.id, [] as Engine[]]),
    ) as Record<CategoryId, Engine[]>;

    for (const engine of allEngines) {
      const normalizedCategory = normalizeEngineCategory(engine.category);
      const categoryId = grouped[normalizedCategory]
        ? normalizedCategory
        : getFallbackCategoryId();
      grouped[categoryId] = [
        ...(grouped[categoryId] ?? []),
        { ...engine, category: categoryId },
      ];
    }

    return grouped;
  }

  function syncSearchSettingEnginesFromGroups(
    groups: Record<CategoryId, Engine[]> = settingEngineGroups,
  ) {
    const orderedEngines = settingEngineCategories.flatMap((category) =>
      (groups[category.id] ?? []).map((engine) => ({
        ...engine,
        category: category.id,
      })),
    );

    settingEnabledEngines = orderedEngines.filter(
      (engine) => engine.enabled !== false,
    );
    settingDisabledEngines = orderedEngines.filter(
      (engine) => engine.enabled === false,
    );
  }

  function syncSearchEngineGroups() {
    const nextGroups = buildSearchEngineGroups();
    settingEngineGroups = nextGroups;
    syncSearchSettingEnginesFromGroups(nextGroups);
  }

  function setSearchEngineGroupItems(categoryId: CategoryId, items: Engine[]) {
    const nextGroups = {
      ...settingEngineGroups,
      [categoryId]: items.map((item) => ({
        ...item,
        category: categoryId,
      })),
    };
    settingEngineGroups = nextGroups;
    syncSearchSettingEnginesFromGroups(nextGroups);
  }

  function queuePersistSearchEngineLayout() {
    if (persistEngineLayoutTimer) {
      clearTimeout(persistEngineLayoutTimer);
    }
    persistEngineLayoutTimer = setTimeout(() => {
      persistEngineLayoutTimer = null;
      void persistSearchEngineLayout();
    }, 16);
  }

  async function persistSearchEngineLayout() {
    const orderedEngines = settingEngineCategories.flatMap((category) =>
      (settingEngineGroups[category.id] ?? []).map((engine, index) => ({
        ...engine,
        category: category.id,
        order: index,
      })),
    );
    const orderedWithIds: (Engine & { id: number })[] = orderedEngines.flatMap(
      (engine) => (engine.id ? [{ ...engine, id: engine.id }] : []),
    );
    if (!orderedWithIds.length) return;

    settingEnginesSaving = true;
    try {
      await updateEnginesLayout(orderedWithIds);
      const synced = orderedWithIds.map((engine, index) => ({
        ...engine,
        order: index,
      }));
      const nextGroups = buildSearchEngineGroups(synced);
      settingEngineGroups = nextGroups;
      syncSearchSettingEnginesFromGroups(nextGroups);
      notifyEngineConfigUpdated();
    } finally {
      settingEnginesSaving = false;
    }
  }

  function handleSearchEngineGroupConsider(
    categoryId: CategoryId,
    e: CustomEvent<DndEvent<Engine>>,
  ) {
    setSearchEngineGroupItems(categoryId, e.detail.items);
  }

  function handleSearchEngineGroupFinalize(
    categoryId: CategoryId,
    e: CustomEvent<DndEvent<Engine>>,
  ) {
    setSearchEngineGroupItems(categoryId, e.detail.items);
    queuePersistSearchEngineLayout();
  }

  function openCategoryManager() {
    showCategoryManager = true;
    closeSearchEngineEditor();
  }

  function closeCategoryManager() {
    showCategoryManager = false;
  }

  let addingToCategoryId = $state<string | null>(null);

  function openAddSearchEngineEditor() {
    editingSearchEngine = null;
    addingToCategoryId = null;
    showSearchEngineEditor = true;
    closeCategoryManager();
  }

  function openAddSearchEngineEditorForCategory(categoryId: string) {
    editingSearchEngine = null;
    addingToCategoryId = categoryId;
    showSearchEngineEditor = true;
    closeCategoryManager();
  }

  function openEditSearchEngineEditor(engine: Engine) {
    editingSearchEngine = engine;
    showSearchEngineEditor = true;
    closeCategoryManager();
  }

  function closeSearchEngineEditor() {
    editingSearchEngine = null;
    addingToCategoryId = null;
    showSearchEngineEditor = false;
  }

  function buildEngineFaviconUrl(engineUrl: string) {
    try {
      const previewUrl = new URL(engineUrl.replace("%s", "search"));
      return `https://www.google.com/s2/favicons?domain=${previewUrl.hostname}&sz=64`;
    } catch {
      return "";
    }
  }

  async function loadSearchSettingEngines(force: boolean = false) {
    if (settingEnginesLoading) return;
    if (!force && settingEnginesLoaded) return;
    if (persistEngineLayoutTimer) {
      clearTimeout(persistEngineLayoutTimer);
      persistEngineLayoutTimer = null;
    }
    settingEnginesLoading = true;
    try {
      await ensureDefaultEngineCategories(buildDefaultEngineCategories());
      const [categories, enabled, disabled] = await Promise.all([
        getEngineCategories(),
        getEnabledEngines(),
        getDisabledEngines(),
      ]);
      settingEngineCategories = categories;
      const fallbackCategoryId = categories[0]?.id ?? "1";
      settingEnabledEngines = enabled.map((engine) => ({
        ...engine,
        enabled: true,
      }));
      settingDisabledEngines = disabled.map((engine) => ({
        ...engine,
        enabled: false,
      }));
      settingEnabledEngines = settingEnabledEngines.map((engine) => ({
        ...engine,
        category: engine.category?.trim() || fallbackCategoryId,
      }));
      settingDisabledEngines = settingDisabledEngines.map((engine) => ({
        ...engine,
        category: engine.category?.trim() || fallbackCategoryId,
      }));
      syncSearchEngineGroups();
      applyPendingCategoryExpansion();
      if (expandedCategoryIds.size === 0 && categories[0]?.id) {
        expandedCategoryIds = new Set([categories[0].id]);
      }
      settingEnginesLoaded = true;
    } finally {
      settingEnginesLoading = false;
    }
  }

  function toggleCategoryExpanded(categoryId: string) {
    expandedCategoryIds = new Set(expandedCategoryIds);
    if (expandedCategoryIds.has(categoryId)) {
      expandedCategoryIds.delete(categoryId);
    } else {
      expandedCategoryIds.add(categoryId);
    }
  }

  function getAllSearchSettingEngines() {
    return sortSearchEngines([
      ...settingEnabledEngines,
      ...settingDisabledEngines,
    ]);
  }

  function getGroupedSearchEngines() {
    return settingEngineCategories.map((category) => ({
      id: category.id,
      name: category.name,
      items: settingEngineGroups[category.id] ?? [],
    }));
  }

  async function addSearchCategory(name: string): Promise<string | void> {
    settingEnginesSaving = true;
    try {
      const newId = await addEngineCategory(name);
      await loadSearchSettingEngines(true);
      notifyEngineConfigUpdated();
      return newId;
    } finally {
      settingEnginesSaving = false;
    }
  }

  async function renameSearchCategoryById(id: string, name: string) {
    settingEnginesSaving = true;
    try {
      await renameEngineCategory(id, name);
      await loadSearchSettingEngines(true);
      notifyEngineConfigUpdated();
    } finally {
      settingEnginesSaving = false;
    }
  }

  async function deleteSearchCategoryById(id: string) {
    if (settingEngineCategories.length <= 1) return;
    const fallbackCategoryId = settingEngineCategories.find(
      (item) => item.id !== id,
    )?.id;
    if (!fallbackCategoryId) return;
    settingEnginesSaving = true;
    try {
      await deleteEngineCategory(id, fallbackCategoryId);
      await loadSearchSettingEngines(true);
      notifyEngineConfigUpdated();
    } finally {
      settingEnginesSaving = false;
    }
  }

  async function reorderSearchCategories(
    items: (EngineCategoryItem & { id: string })[],
  ) {
    settingEnginesSaving = true;
    try {
      settingEngineCategories = items.map((item, index) => ({
        ...item,
        order: index,
      }));
      syncSearchEngineGroups();
      await updateEngineCategoriesOrder(items);
      notifyEngineConfigUpdated();
    } finally {
      settingEnginesSaving = false;
    }
  }

  async function saveSearchEngineEditor(payload: {
    title: string;
    engineUrl: string;
    category: string;
    enabled: boolean;
  }) {
    const normalizedCategory = normalizeEngineCategory(payload.category);
    settingEnginesSaving = true;
    try {
      if (editingSearchEngine?.id) {
        const currentEngine =
          settingEnabledEngines.find(
            (item) => item.id === editingSearchEngine?.id,
          ) ??
          settingDisabledEngines.find(
            (item) => item.id === editingSearchEngine?.id,
          );
        if (!currentEngine) return;
        await updateEngine({
          ...currentEngine,
          id: editingSearchEngine.id,
          title: payload.title,
          engineUrl: payload.engineUrl,
          faviconUrl:
            buildEngineFaviconUrl(payload.engineUrl) ||
            currentEngine.faviconUrl,
          category: normalizedCategory,
          enabled: payload.enabled,
        });
      } else {
        await addEngine({
          title: payload.title,
          engineUrl: payload.engineUrl,
          faviconUrl: buildEngineFaviconUrl(payload.engineUrl),
          category: normalizedCategory,
          enabled: payload.enabled,
        });
      }
      await loadSearchSettingEngines(true);
      notifyEngineConfigUpdated();
    } finally {
      settingEnginesSaving = false;
    }
  }

  async function removeSearchEngine(engine: Engine) {
    if (!engine.id) return;
    settingEnginesSaving = true;
    try {
      await deleteEngine(engine.id);
      if (editingSearchEngine?.id === engine.id) {
        closeSearchEngineEditor();
      }
      await loadSearchSettingEngines(true);
      notifyEngineConfigUpdated();
    } finally {
      settingEnginesSaving = false;
    }
  }

  async function removeEditingSearchEngine() {
    if (!editingSearchEngine) return;
    await removeSearchEngine(editingSearchEngine);
  }

  async function resetSearchEnginesToDefaultConfirm() {
    if (settingEnginesSaving) return;
    const msg = t("nt_settings_search_reset_confirm");
    if (!confirm(msg)) return;
    settingEnginesSaving = true;
    try {
      const defaultCategories = buildDefaultEngineCategories();
      const defaultEngines = buildDefaultEngines(userSettings.language);
      await resetSearchEnginesToDefault(defaultCategories, defaultEngines);
      await loadSearchSettingEngines(true);
      notifyEngineConfigUpdated();
    } finally {
      settingEnginesSaving = false;
    }
  }

  $effect(() => {
    if (!showSetting && settingPage !== "root") {
      settingPage = "root";
    }
  });

  onMount(() => {
    window.addEventListener("engine-config-updated", handleEngineConfigUpdated);
    return () => {
      window.removeEventListener(
        "engine-config-updated",
        handleEngineConfigUpdated,
      );
    };
  });

  $effect(() => {
    if (!showSetting) return;
    if (!openSearchEnginesRequest) return;
    if (openSearchEnginesRequest.id === lastOpenSearchEnginesRequestId) return;
    lastOpenSearchEnginesRequestId = openSearchEnginesRequest.id;
    pendingExpandCategoryId = openSearchEnginesRequest.categoryId ?? null;
    openSettingPage("searchEngines");
  });

  $effect(() => {
    if (showSetting && settingPage === "searchEngines") return;
    closeCategoryManager();
    closeSearchEngineEditor();
  });

  $effect(() => {
    if (!showSetting) return;
    if (settingPage !== "searchEngines") return;
    if (settingEnginesLoaded || settingEnginesLoading) return;
    void loadSearchSettingEngines();
  });
</script>

<div class="layout">
  <div class="left" class:shrink={showSetting}>
    <div class="app_box" class:radius={showSetting}>
      {@render children()}
    </div>
  </div>
  {#if showSetting}
    <div class="setting" transition:slide={{ duration: 200, axis: "x" }}>
      <div class="header">
        <Button
          onclick={settingPage === "root" ? undefined : goBackSettingPage}
          skipTabFocus={settingPage === "root"}
        >
          <G>
            <Icon
              name="ChevronLeft"
              color="var(--c-text)"
              opacity={settingPage === "root" ? 0 : 0.6}
            />
          </G>
        </Button>
        <G full>
          <T type="m" align="c">{getSettingPageTitle()}</T>
        </G>
        <Button
          onclick={settingPage === "searchEngines"
            ? resetSearchEnginesToDefaultConfirm
            : undefined}
          skipTabFocus={settingPage !== "searchEngines"}
        >
          <G>
            <Icon
              name="RotateCcw"
              color="var(--c-text)"
              opacity={settingPage === "searchEngines" ? 0.6 : 0}
            />
          </G>
        </Button>
      </div>
      <div class="setting_body">
        {#key settingPage}
          <div
            class="setting_page"
            in:fly={{
              x: pageDirection === 1 ? 160 : -160,
              duration: 200,
            }}
            out:fly={{
              x: pageDirection === 1 ? -160 : 160,
              duration: 200,
            }}
          >
            {#if settingPage === "root"}
              {@render temSettingRoot()}
            {:else if settingPage === "searchScope"}
              {@render temSettingSearchScope()}
            {:else if settingPage === "searchEngines"}
              {@render temSettingSearchEngines()}
            {:else if settingPage === "common"}
              {@render temSettingCommon()}
            {:else if settingPage === "bookmarks"}
              {@render temSettingBookmarks()}
            {:else if settingPage === "history"}
              {@render temSettingHistory()}
            {:else}
              {@render temSettingOther()}
            {/if}
          </div>
        {/key}
      </div>
    </div>
  {/if}
</div>

{#if showCategoryManager}
  <ManageEngineCategories
    categories={settingEngineCategories}
    saving={settingEnginesSaving}
    onAdd={async (name) => {
      await addSearchCategory(name);
    }}
    onRename={renameSearchCategoryById}
    onDelete={deleteSearchCategoryById}
    onReorder={reorderSearchCategories}
    onclickClose={closeCategoryManager}
  />
{/if}

{#if showSearchEngineEditor}
  <EditSearchEngine
    isEdit={!!editingSearchEngine}
    titleValue={editingSearchEngine?.title}
    urlValue={editingSearchEngine?.engineUrl}
    categoryValue={editingSearchEngine
      ? normalizeEngineCategory(editingSearchEngine.category)
      : (addingToCategoryId ?? getFallbackCategoryId())}
    enabledValue={editingSearchEngine?.enabled !== false}
    categoryOptions={getSearchEngineCategoryOptions()}
    saving={settingEnginesSaving}
    onSave={saveSearchEngineEditor}
    onDelete={editingSearchEngine ? removeEditingSearchEngine : undefined}
    onclickClose={closeSearchEngineEditor}
  />
{/if}

{#snippet temSettingRoot()}
  <div class="setting_con">
    {@render temSectionTitle(t("nt_settings_search_title"))}
    {@render temEntranceItem(t("nt_settings_search_scope"), () =>
      openSettingPage("searchScope"),
    )}
    {@render temEntranceItem(t("nt_settings_search_engines_title"), () =>
      openSettingPage("searchEngines"),
    )}

    <Divider />

    {@render temSectionTitle(t("nt_settings_websites_title"))}
    {@render temEntranceItem(t("nt_tab_common"), () =>
      openFeatureTab("common"),
    )}
    {@render temEntranceItem(t("nt_tab_bookmarks"), () =>
      openFeatureTab("bookmark"),
    )}
    {@render temEntranceItem(t("nt_tab_history"), () =>
      openFeatureTab("history"),
    )}
    {@render temselectItem(
      t("nt_settings_default_open"),
      openPosOptions,
      setOpenPos,
    )}
    {@render temswithcItem(
      t("nt_settings_link_open_title"),
      t("nt_settings_new_tab_open"),
      t("nt_settings_new_tab_tip"),
      effectiveNewTabOpenSwitch,
      onswitchNewTabOpen,
      lockNewTabOpenSwitch,
    )}

     <Divider />
    {@render temselectItem(
      t("nt_settings_language"),
      languageOptions,
      setLanguage,
    )}
    {@render tembuttonItem(t("nt_settings_about"), onclickAbout,t('nt_settings_other_title'))}
    {@render tembuttonItem(t("nt_about_support_button"), onclickSupport)}
  </div>
{/snippet}

{#snippet temSettingSearchScope()}
  <div class="setting_con">
    {@render temswithcItem(
      t("nt_settings_search_scope"),
      t("nt_settings_search_bookmarks"),
      undefined,
      userSettings.searchBookmarks,
      setSearchBookmarks,
    )}
    {@render temswithcItem(
      undefined,
      t("nt_settings_search_history"),
      undefined,
      userSettings.searchHistory,
      setSearchHistory,
    )}
  </div>
{/snippet}

{#snippet temSettingSearchEngines()}
  <div class="setting_con">
    {@render tembuttonItem(
      t("nt_settings_search_categories_title"),
      openCategoryManager,
    )}
    <div class="categories_list">
      {#if settingEnginesLoading && !settingEnginesLoaded}
        <div class="engine_loading">
          <G>
            <Icon name="Loading" color="var(--c-text)" />
          </G>
        </div>
      {:else}
        {@render temSearchEngineGroups()}
      {/if}
    </div>
  </div>
{/snippet}

{#snippet temSectionTitle(text: string)}
  <div class="section_title">
    <T type="s" color="var(--c-text-1)">{text}</T>
  </div>
{/snippet}

{#snippet temSettingCommon()}
  <div class="setting_con">
    {@render temselectItem(
      t("nt_settings_language"),
      languageOptions,
      setLanguage,
    )}
    {@render temswithcItem(
      t("nt_settings_link_open_title"),
      t("nt_settings_new_tab_open"),
      t("nt_settings_new_tab_tip"),
      effectiveNewTabOpenSwitch,
      onswitchNewTabOpen,
      lockNewTabOpenSwitch,
    )}
    {@render temselectItem(
      t("nt_settings_default_open"),
      openPosOptions,
      setOpenPos,
    )}
  </div>
{/snippet}

{#snippet temSettingBookmarks()}
  <div class="setting_con">
    {@render temEmptyItem()}
  </div>
{/snippet}

{#snippet temSettingHistory()}
  <div class="setting_con">
    {@render temEmptyItem()}
  </div>
{/snippet}

{#snippet temSettingOther()}
  <div class="setting_con">
    {@render tembuttonItem(
      t("nt_settings_about"),
      onclickAbout,
      t("nt_settings_other_title"),
    )}
    {@render tembuttonItem(t("nt_about_support_button"), onclickSupport)}
  </div>
{/snippet}

{#snippet temEntranceItem(text: string, onChange: () => void, title?: string)}
  <div class="select_item">
    {#if title}
      <G>
        <T type="s" color="var(--c-text-1)">{title}</T>
      </G>
    {/if}
      <Button full align="c" onclick={onChange} fill r='r1'>
        <G full align="c">
        <G vertical full>
          <T>{text}</T>
        </G>
        <G>
          <Icon name="ChevronRight" color="var(--c-text)" opacity={0.6} />
        </G>
        </G>
      </Button>
  </div>
{/snippet}

{#snippet temEmptyItem()}
  <div class="select_item">
    <G>
      <T type="s" color="var(--c-text-1)">{t("nt_settings_empty")}</T>
    </G>
  </div>
{/snippet}

{#snippet temSearchEngineGroups()}
  {#each getGroupedSearchEngines() as group (group.id)}
    {@const isExpanded = expandedCategoryIds.has(group.id)}
    <div class="engine_group">
      <Button full onclick={() => toggleCategoryExpanded(group.id)}>
        <G full align="c">
          <Icon
            name={isExpanded ? "ChevronDown" : "ChevronRight"}
            color="var(--c-text-1)"
          />
          <T type="m" color="var(--c-text)" nowrap>{group.name}</T>
        </G>
        <G align="c">
          <T type="s" color="var(--c-text-2)" nowrap>{group.items.length}</T>
        </G>
      </Button>

      {#if isExpanded}
        <div
          class="engine_list_wrapper"
          class:engine_list_empty={!group.items.length}
          transition:slide={{ duration: 200 }}
        >
          <div
            class="engine_list"
            use:dndzone={{
              items: group.items,
              flipDurationMs: 200,
              type: "settings-engines",
              zoneTabIndex: -1,
              zoneItemTabIndex: -1,
              dropTargetStyle: {},
              dragDisabled: settingEnginesSaving,
            }}
            onconsider={(e) => handleSearchEngineGroupConsider(group.id, e)}
            onfinalize={(e) => handleSearchEngineGroupFinalize(group.id, e)}
          >
            {#each group.items as engine (engine.id)}
              <div
                class="engine_row"
                class:disabled_engine={engine.enabled === false}
                animate:flip={{ duration: 200 }}
              >
                <Button
                  full
                  onclick={() => openEditSearchEngineEditor(engine)}
                  align="c"
                  fill
                >
                  <G full align="c">
                    <EngineIcon
                      alt={engine.title ?? "?"}
                      engineUrl={engine.engineUrl}
                    />
                    <T
                      nowrap
                      color={engine.enabled
                        ? "var(--c-text)"
                        : "var(--c-text-1)"}
                      >{engine.title ?? t("nt_unnamed")}</T
                    >
                  </G>
                  {#if !engine.enabled}
                    <G>
                      <T type="s" color="var(--c-text-2)" nowrap
                        >{t("nt_settings_search_disabled_tag")}</T
                      >
                    </G>
                  {/if}
                </Button>
              </div>
            {/each}
          </div>
          <Button
            onclick={() => openAddSearchEngineEditorForCategory(group.id)}
          >
            <G align="c">
              <Icon name="Plus" color="var(--c-text)" opacity={0.5} />
              <T type="s">{t("nt_settings_search_add_engine")}</T>
            </G>
          </Button>
        </div>
      {/if}
    </div>
  {/each}
  <G full>
    <T type='s'>{t('nt_settings_search_drag_reorder_or_move')}</T>
  </G>
{/snippet}

{#snippet tembuttonItem(
  text: string,
  onChange: () => void,
  title?: string,
  externalLink?: boolean,
)}
  <div class="select_item">
    {#if title}
      <G>
        <T type="s" color="var(--c-text-1)">{title}</T>
      </G>
    {/if}
      <Button onclick={onChange} full align="c" fill r='r1'>
        <G full align="c">
        <G vertical full>
          <T>{text}</T>
        </G>
        <G>
          <Icon
            name="ArrowUpRight"
            color="var(--c-text)"
            opacity={externalLink ? 0.6 : 0}
          />
        </G>
        </G>
      </Button>
  </div>
{/snippet}

{#snippet temswithcItem(
  title: string | undefined,
  swcText: string,
  des: string | undefined,
  turnOn: boolean,
  onChange: (value: boolean) => void,
  switchDisabled: boolean = false,
)}
  <div class="select_item">
    {#if title}
      <G>
        <T type="s" color="var(--c-text-1)">{title}</T>
      </G>
    {/if}
    <Button onclick={() => onChange(!turnOn)} full fill align="c" r="r1">
      <G full align="c">
        <G vertical full>
          <T>{swcText}</T>
        </G>
        <G>
          <Switch {turnOn} disabled={switchDisabled} />
        </G>
      </G>
    </Button>
    {#if des}
      <G>
        <T type="s">{des}</T>
      </G>
    {/if}
  </div>
{/snippet}

{#snippet temselectItem(
  title: string,
  options: SelectOption[],
  onChange: (value: string) => void,
)}
  <div class="select_item">
    <G vertical full>
      <T type="s" color="var(--c-text-1)">{title}</T>
    </G>
    <Select {options} {onChange} />
  </div>
{/snippet}

<style>
  .categories_list {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
    gap: calc(var(--gap) * 2);
  }
  .select_item {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
    /* gap: var(--gap); */
  }
  .section_title {
    display: flex;
    width: 100%;
    box-sizing: border-box;
    padding: calc(var(--gap) * 1.5) var(--gap) 0;
  }
  .engine_loading {
    display: flex;
    justify-content: center;
    padding: var(--gap);
  }
  .engine_group {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    gap: var(--gap);
  }
  .engine_list_wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    gap: var(--gap);
    border: 1px solid var(--c-border);
    border-radius: var(--r1);
    padding: var(--gap);
  }
  .engine_list_wrapper.engine_list_empty {
    border: 1px dashed var(--c-border);
    min-height: 40px;
  }
  .engine_list {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    gap: var(--gap);
    min-height: 40px;
  }
  .engine_row {
    display: flex;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
    border-radius: var(--r);
  }
  .disabled_engine {
    filter: grayscale(1);
  }

  .setting_con {
    width: 300px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .setting_body {
    display: grid;
    width: 300px;
    overflow: hidden;
    height: 100%;
    overflow-y: auto;
  }
  .setting_page {
    grid-area: 1 / 1;
    width: 100%;
    will-change: transform, opacity;
  }
  .app_box {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    position: relative;
    overflow: hidden;
    background: radial-gradient(
      circle at bottom,
      var(--c-main-3) 0%,
      var(--c-bg) 50%
    );
  }
  .radius {
    border-radius: var(--r1);
  }
  .shrink {
    padding: var(--gap);
  }
  .left {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    align-items: center;
    transition: padding 0.3s ease-out;
  }
  .setting {
    display: flex;
    flex-direction: column;
    padding: var(--gap) var(--gap) var(--gap) 0;
  }
  .layout {
    display: flex;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }
  .header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    flex-wrap: nowrap;
    padding: var(--gap);
  }
</style>
