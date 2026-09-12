<script lang="ts">
  import { onMount } from "svelte";
  import Button from "./components/Button.svelte";
  import G from "./components/G.svelte";
  import Input from "./components/Input.svelte";
  import Popup from "./components/Popup.svelte";
  import Select, { type SelectOption } from "./components/Select.svelte";
  import Switch from "./components/Switch.svelte";
  import T from "./components/T.svelte";
  import { t } from "@/lib/utils/i18n";

  interface Props {
    isEdit?: boolean;
    titleValue?: string;
    urlValue?: string;
    categoryValue?: string;
    enabledValue?: boolean;
    categoryOptions: SelectOption[];
    saving?: boolean;
    onSave: (payload: {
      title: string;
      engineUrl: string;
      category: string;
      enabled: boolean;
    }) => void | Promise<void>;
    onDelete?: () => boolean | void | Promise<boolean | void>;
    onclickClose: () => void;
  }

  let {
    isEdit = false,
    titleValue,
    urlValue,
    categoryValue,
    enabledValue = true,
    categoryOptions,
    saving = false,
    onSave,
    onDelete,
    onclickClose,
  }: Props = $props();

  let inputTitleValue = $state("");
  let inputUrlValue = $state("");
  let selectedCategoryId = $state("");
  let enabled = $state(true);
  let inputError = $state("");

  let popupCategoryOptions = $derived(
    categoryOptions.map((item) => ({
      ...item,
      sel: item.value === selectedCategoryId,
    })),
  );

  onMount(() => {
    inputTitleValue = titleValue ?? "";
    inputUrlValue = urlValue ?? "";
    selectedCategoryId = categoryValue ?? categoryOptions[0]?.value ?? "";
    enabled = enabledValue;
  });

  function setCategory(value: string) {
    selectedCategoryId = value;
  }

  function validate() {
    const normalizedTitle = inputTitleValue.trim();
    const normalizedUrl = inputUrlValue.trim();
    if (!normalizedTitle) {
      return t("nt_settings_search_engine_name_required");
    }
    if (!normalizedUrl) {
      return t("nt_settings_search_engine_url_required");
    }
    if (!normalizedUrl.includes("%s")) {
      return t("nt_settings_search_engine_url_keyword");
    }
    try {
      new URL(normalizedUrl.replace("%s", "search"));
    } catch {
      return t("nt_settings_search_engine_url_invalid");
    }
    return "";
  }

  async function clickSave() {
    if (saving) return;
    inputError = validate();
    if (inputError) return;
    try {
      await onSave({
        title: inputTitleValue.trim(),
        engineUrl: inputUrlValue.trim(),
        category: selectedCategoryId,
        enabled,
      });
    } catch (error) {
      console.error("[Mooogor NewTab]", "search-engine:save-failed", error);
      inputError = t("nt_common_save_failed");
      return;
    }
    onclickClose();
  }

  async function clickDelete() {
    if (!onDelete) return;
    const deleted = await onDelete();
    if (deleted !== false) onclickClose();
  }
</script>

<Popup
  type="m"
  title={isEdit
    ? t("nt_settings_search_edit_engine")
    : t("nt_settings_search_add_engine")}
  {onclickClose}
>
  <G vertical>
    <G full>
      <T type="s" color="var(--c-text-1)">
        {t("nt_settings_search_engine_category")}
      </T>
    </G>
    <Select options={popupCategoryOptions} onChange={setCategory} />
  </G>

  <G full>
    <Input
      name="engine-title"
      type="text"
      placeholder={t("nt_input_name")}
      bind:value={inputTitleValue}
      disabled={saving}
    />
  </G>
  <G full>
    <Input
      name="engine-url"
      type="text"
      placeholder={t("nt_settings_search_engine_url_placeholder")}
      bind:value={inputUrlValue}
      disabled={saving}
      err={inputError}
    />
  </G>

  <G full>
    <G full fill r="r1">
      <Button full onclick={() => !saving && (enabled = !enabled)}>
        <G full align="c">
          <T>{t("nt_settings_search_engine_enabled")}</T>
          <Switch turnOn={enabled} disabled={saving} />
        </G>
      </Button>
    </G>
  </G>

  <div class:has_delete={isEdit && !!onDelete} class="actions">
    {#if isEdit && onDelete}
      <Button fill r="r1" onclick={() => void clickDelete()}>
        <G align="c">
          <G>
            <T align="c" color="var(--c-red)">{t("nt_delete")}</T>
          </G>
        </G>
      </Button>
    {/if}
    <div class="actions_right">
      <Button fill r="r1" onclick={onclickClose}>
        <G><G><T align="c">{t("nt_cancel")}</T></G></G>
      </Button>
      <Button onclick={() => void clickSave()} bg="var(--c-text)" r="r1">
        <G>
          <G full>
            <T align="c" color="var(--c-bg)">{t("nt_save")}</T>
          </G>
        </G>
      </Button>
    </div>
  </div>
</Popup>

<style>
  .actions {
    display: flex;
    align-items: center;
    flex-direction: row;
    justify-content: flex-end;
    gap: var(--gap);
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
  }
  .actions.has_delete {
    justify-content: space-between;
  }
  .actions_right {
    display: flex;
    align-items: center;
    gap: var(--gap);
  }
</style>
