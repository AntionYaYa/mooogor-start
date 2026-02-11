<script lang="ts">
  import { slide } from "svelte/transition";
  import G from "./components/G.svelte";
  import T from "./components/T.svelte";
  import Switch from "./components/Switch.svelte";
  import Select, { type SelectOption } from "./components/Select.svelte";
  import type { UserSettings } from "@/lib/utils/settings";
  import { t } from "@/lib/utils/i18n";
  interface Props {
    children: any;
    showSetting: boolean;
    userSettings: UserSettings;
    onchangeUserSettings: (userSettings: UserSettings) => void;
  }
  let { children, showSetting, userSettings, onchangeUserSettings }: Props =
    $props();

  const languageBase = [
    { label: t("nt_lang_zh_cn"), value: "zh-CN" },
    { label: t("nt_lang_en"), value: "en-US" },
  ] as const;

  let languageOptions = $derived(
    languageBase.map((o) => ({ ...o, sel: o.value === userSettings.language }))
  );
  function setLanguage(value: string) {
    onchangeUserSettings({
      ...userSettings,
      language: value as UserSettings["language"],
    });
  }

  const openPosBase = [
    { label: t("nt_default_common"), value: "common" },
    { label: t("nt_default_bookmark"), value: "bookmark" },
    { label: t("nt_default_history"), value: "history" },
  ] as const;
  
  let openPosOptions = $derived(
    openPosBase.map((o) => ({
      ...o,
      sel: o.value === userSettings.defaultOpen,
    }))
  );
  function setOpenPos(value: string) {
    onchangeUserSettings({
      ...userSettings,
      defaultOpen: value as UserSettings["defaultOpen"],
    });
  }

  function setNewTabOpen(value: boolean) {
    onchangeUserSettings({ ...userSettings, newTabOpen: value });
  }
</script>

<div class="layout">
  <div class="left" class:shrink={showSetting}>
    <div class="apge_box" class:radius={showSetting}>
      {@render children()}
    </div>
  </div>
  {#if showSetting}
    <div class="setting" transition:slide={{ duration: 300, axis: "x" }}>
      {@render temSettiong()}
    </div>
  {/if}
</div>

{#snippet temSettiong()}
  <div class="setting_con">
    {@render temsettingItem()}
    {@render temselectItem(t("nt_settings_language"), languageOptions, setLanguage)}
    {@render temselectItem(t("nt_settings_default_open"), openPosOptions, setOpenPos)}
    <G vertical>
      <T>{t("nt_settings_feedback")}</T>
    </G>
    <G vertical>
      <T>{t("nt_settings_about")}</T>
    </G>
    <G vertical>
      <T>{t("nt_settings_version")}</T>
    </G>
    <G vertical>
      <T>{t("nt_settings_support")}</T>
    </G>
  </div>
{/snippet}

{#snippet temsettingItem()}
  <G align="c" full>
    <G vertical full>
      <T>{t("nt_settings_new_tab_open")}</T>
      <T type="s">{t("nt_settings_new_tab_tip")}</T>
    </G>
    <G>
      <Switch
        turnOn={userSettings.newTabOpen}
        onSwitch={(swith) => {
          setNewTabOpen(swith);
        }}
      ></Switch>
    </G>
  </G>
{/snippet}

{#snippet temselectItem(title: string, options: SelectOption[], onChange: (value: string) => void)}
  <div class="select_item">
    <G vertical full>
      <T>{title}</T>
    </G>
    <Select {options} {onChange} />
  </div>
{/snippet}

<style>
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
  .apge_box {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    height: 100%;
    box-sizing: border-box;

    /* background: url(../../assets/bg3.jpg); */
    background-color: var(--c-bg);

    position: relative;
    overflow: hidden;
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
    position: relative;
    align-items: center;
    background-color: var(--c-bg-1);
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
