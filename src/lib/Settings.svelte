<script lang="ts">
  import { fly, slide } from "svelte/transition";
  import G from "./components/G.svelte";
  import T from "./components/T.svelte";
  import Switch from "./components/Switch.svelte";
  import Select, { type SelectOption } from "./components/Select.svelte";
  import EditSearchEngine from "./EditSearchEngine.svelte";
  import ManageEngineCategories from "./ManageEngineCategories.svelte";
  import type { UserSettings } from "@/lib/utils/settings";
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
    updateEngineCategoriesOrder,
    updateEngine,
  } from "@/lib/DB/DB";
  import { t } from "@/lib/utils/i18n";
  import Icon from "./components/Icon.svelte";
  import Button from "./components/Button.svelte";
  interface Props {
    children: any;
    showSetting: boolean;
    userSettings: UserSettings;
    onchangeUserSettings: (userSettings: UserSettings) => void;
    onclickAbout: () => void;
    onclickSupport: () => void;
    currentTabPinned?: boolean;
  }
  let {
    children,
    showSetting,
    userSettings,
    onchangeUserSettings,
    onclickAbout,
    onclickSupport,
    currentTabPinned = false,
  }: Props = $props();

  const openPosBase = [
    { label: t("nt_default_common"), value: "common" },
    { label: t("nt_default_bookmark"), value: "bookmark" },
    { label: t("nt_default_history"), value: "history" },
    { label: t("nt_default_last"), value: "last", dividerTop: true },
  ] as const;

  const languageBase = [
    { label: t("nt_lang_auto"), value: "auto" },
    { label: "简体中文", value: "zh_CN" },
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
    | "search"
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
  let settingEnginesLoading = $state(false);
  let settingEnginesLoaded = $state(false);
  let settingEnginesSaving = $state(false);
  let showCategoryManager = $state(false);
  let showSearchEngineEditor = $state(false);
  let editingSearchEngine: Engine | null = $state(null);

  function openSettingPage(page: Exclude<SettingsPage, "root">) {
    pageDirection = 1;
    settingPage = page;
    if (page === "search") {
      void loadSearchSettingEngines(true);
    }
  }

  function goBackSettingPage() {
    pageDirection = -1;
    settingPage = "root";
  }

  function getSettingPageTitle() {
    if (settingPage === "search") return t("nt_settings_search_title");
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

  function notifyEngineConfigUpdated() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("engine-config-updated"));
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

  function getSearchEngineCategoryOptions(): SelectOption[] {
    return settingEngineCategories.map((item) => ({
      label: item.name,
      value: item.id,
      sel: false,
    }));
  }

  function openCategoryManager() {
    showCategoryManager = true;
    closeSearchEngineEditor();
  }

  function closeCategoryManager() {
    showCategoryManager = false;
  }

  function openAddSearchEngineEditor() {
    editingSearchEngine = null;
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
      settingEnabledEngines = enabled.map((engine) => ({ ...engine, enabled: true }));
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
      settingEnginesLoaded = true;
    } finally {
      settingEnginesLoading = false;
    }
  }

  function getAllSearchSettingEngines() {
    return [...settingEnabledEngines, ...settingDisabledEngines];
  }

  function getGroupedSearchEngines() {
    const allEngines = getAllSearchSettingEngines();
    return settingEngineCategories
      .map((category) => ({
        id: category.id,
        name: category.name,
        items: allEngines.filter(
          (engine) => normalizeEngineCategory(engine.category) === category.id,
        ),
      }))
      .filter((group) => group.items.length > 0);
  }

  async function addSearchCategory(name: string) {
    settingEnginesSaving = true;
    try {
      await addEngineCategory(name);
      await loadSearchSettingEngines(true);
      notifyEngineConfigUpdated();
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
            buildEngineFaviconUrl(payload.engineUrl) || currentEngine.faviconUrl,
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

  $effect(() => {
    if (!showSetting && settingPage !== "root") {
      settingPage = "root";
    }
  });

  $effect(() => {
    if (showSetting && settingPage === "search") return;
    closeCategoryManager();
    closeSearchEngineEditor();
  });

  $effect(() => {
    if (!showSetting) return;
    if (settingPage !== "search") return;
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
        <Button skipTabFocus>
          <G>
            <Icon name="ChevronLeft" color="var(--c-text)" opacity={0} />
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
            {:else if settingPage === "search"}
              {@render temSettingSearch()}
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
    onAdd={addSearchCategory}
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
    categoryValue={normalizeEngineCategory(editingSearchEngine?.category)}
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
    {@render temEntranceItem(
      t("nt_settings_search_title"),
      () => openSettingPage("search"),
    )}
    {@render temEntranceItem(
      t("nt_tab_common"),
      () => openSettingPage("common"),
    )}
    {@render temEntranceItem(
      t("nt_tab_bookmarks"),
      () => openSettingPage("bookmarks"),
    )}
    {@render temEntranceItem(
      t("nt_tab_history"),
      () => openSettingPage("history"),
    )}
    {@render temEntranceItem(
      t("nt_settings_other_title"),
      () => openSettingPage("other"),
    )}
  </div>
{/snippet}

{#snippet temSettingSearch()}
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
    <div class="select_item">
      <G>
        <T type="s" color="var(--c-text-1)"
          >{t("nt_settings_search_engines_title")}</T
        >
      </G>

      {#if settingEnginesLoading && !settingEnginesLoaded}
        <div class="engine_loading">
          <Icon name="Loading" color="var(--c-text)" />
        </div>
      {:else}
        <div class="engine_manage_sections">
          {@render temSearchEngineGroups()}
        </div>
      {/if}
    </div>
    {@render tembuttonItem(t("nt_settings_search_edit_categories"), openCategoryManager)}
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

{#snippet temEntranceItem(
  text: string,
  onChange: () => void,
  title?: string,
)}
  <div class="select_item">
    {#if title}
      <G>
        <T type="s" color="var(--c-text-1)">{title}</T>
      </G>
    {/if}
    <div class="trigger">
      <Button full align="c" onclick={onChange}>
        <G vertical full>
          <T>{text}</T>
        </G>
        <G>
          <Icon name="ChevronRight" color="var(--c-text)" opacity={0.6} />
        </G>
      </Button>
    </div>
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
  {#if !getAllSearchSettingEngines().length}
    <div class="engine_empty_row">
      <T type="s" color="var(--c-text-1)">{t("nt_settings_search_no_engines")}</T>
    </div>
  {:else}
    {#each getGroupedSearchEngines() as group (group.id)}
      <div class="engine_group">
        <G>
          <T type="s" color="var(--c-text-1)">{group.name}</T>
        </G>
        <div class="engine_list">
          {#each group.items as engine (engine.id)}
            <button
              class="engine_row engine_row_button"
              class:disabled_engine={engine.enabled === false}
              type="button"
              disabled={settingEnginesSaving}
              onclick={() => openEditSearchEngineEditor(engine)}
            >
              {#if engine.faviconUrl}
                <img
                  class="engine_manage_icon"
                  src={engine.faviconUrl}
                  alt={engine.title ?? ""}
                />
              {:else}
                <div class="engine_manage_icon engine_manage_icon_fallback">
                  <T type="s">{engine.title?.slice(0, 1) ?? "?"}</T>
                </div>
              {/if}
              <div class="engine_meta">
                <div class="engine_meta_title">
                  <T nowrap>{engine.title ?? t("nt_unnamed")}</T>
                  {#if engine.enabled === false}
                    <span class="engine_state_tag">
                      <T type="s">{t("nt_settings_search_disabled_tag")}</T>
                    </span>
                  {/if}
                </div>
                <T type="s" color="var(--c-text-1)">{engine.engineUrl}</T>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
  <button
    class="engine_add_btn"
    type="button"
    disabled={settingEnginesSaving}
    onclick={openAddSearchEngineEditor}
  >
    <Icon name="Plus" color="var(--c-text)" opacity={0.5} />
    <T>{t("nt_settings_search_add_engine")}</T>
  </button>
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
    <div class="trigger">
      <Button onclick={onChange} full align="c">
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
      </Button>
    </div>
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
    <div class="trigger">
      <Button onclick={() => onChange(!turnOn)} full align="c">
        <G vertical full>
          <T>{swcText}</T>
        </G>
        <G>
          <Switch {turnOn} disabled={switchDisabled} />
        </G>
      </Button>
    </div>
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
  .trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    box-sizing: border-box;
    background-color: var(--c-mask);
    border: none;
    border-radius: var(--r1);
    padding: var(--gap);
  }
  .trigger:focus-visible {
    outline: 2px solid var(--c-text);
  }
  .select_item {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
    gap: var(--gap);
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
  .engine_manage_sections {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    gap: var(--gap);
  }
  .engine_list {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    gap: var(--gap);
  }
  .engine_row {
    display: flex;
    align-items: center;
    gap: var(--gap);
    width: 100%;
    box-sizing: border-box;
    background-color: var(--c-mask);
    border-radius: var(--r1);
    padding: var(--gap);
    min-width: 0;
  }
  .engine_row_button {
    border: none;
    text-align: left;
    color: inherit;
    cursor: pointer;
  }
  .engine_row_button:focus-visible {
    outline: 2px solid var(--c-text);
  }
  .engine_row_button:disabled {
    cursor: default;
  }
  .disabled_engine {
    opacity: 0.55;
  }
  .engine_empty_row {
    display: flex;
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
    border-radius: var(--r1);
    background-color: var(--c-mask);
  }
  .engine_manage_icon {
    width: 24px;
    height: 24px;
    border-radius: var(--r);
  }
  .engine_manage_icon_fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--c-bg1);
    color: var(--c-text);
    overflow: hidden;
    flex-shrink: 0;
  }
  .engine_meta {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
    gap: 4px;
  }
  .engine_meta_title {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .engine_state_tag {
    display: inline-flex;
    align-items: center;
    padding: 2px 6px;
    border-radius: 999px;
    background-color: var(--c-bg1);
    color: var(--c-text-1);
  }
  .engine_add_btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    box-sizing: border-box;
    border: 1px dashed var(--c-text-2);
    background-color: transparent;
    color: var(--c-text);
    border-radius: var(--r1);
    padding: calc(var(--gap) * 1.2);
  }
  .engine_add_btn:focus-visible {
    outline: 2px solid var(--c-text);
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
    width: 300px;
  }
</style>
