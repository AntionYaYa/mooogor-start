<script lang="ts">
  import { slide } from "svelte/transition";
  import G from "./components/G.svelte";
  import T from "./components/T.svelte";
  import Switch from "./components/Switch.svelte";
  import Select, { type SelectOption } from "./components/Select.svelte";
  import type { UserSettings } from "@/lib/utils/settings";
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

</script>

<div class="layout">
  <div class="left" class:shrink={showSetting}>
    <div class="app_box" class:radius={showSetting}>
        {@render children()}
    </div>
  </div>
  {#if showSetting}
    <div class="setting" transition:slide={{ duration: 200, axis: "x" }}>
      {@render temSettiong()}
    </div>
  {/if}
</div>

{#snippet temSettiong()}
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
    {@render temselectItem(
      t("nt_settings_default_open"),
      openPosOptions,
      setOpenPos,
    )}
    {@render tembuttonItem(
      t("nt_settings_about"),
      onclickAbout,
      t("nt_settings_other_title"),
    )}
    {@render tembuttonItem(
      t("nt_about_support_button"),
      onclickSupport,
    )}
  </div>
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
    <div class="trigger" >
    <Button onclick={onChange} full align='c'>

      <G vertical full>
        <T>{text}</T>
      </G>
      <G>
        <Icon
          name="ArrowUpRight"
          color="var(--c-text)"
          opacity={externalLink ? 0.7 : 0}
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
      <Button onclick={()=>onChange(!turnOn)} full align='c'>
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
  }
  .setting_con {
    width: 300px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
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
    background: radial-gradient(circle at bottom, var(--c-main-3) 0%, var(--c-bg) 50%);
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
</style>
