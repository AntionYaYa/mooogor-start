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
    onDelete?: () => void | Promise<void>;
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
    inputError = validate();
    if (inputError) return;
    await onSave({
      title: inputTitleValue.trim(),
      engineUrl: inputUrlValue.trim(),
      category: selectedCategoryId,
      enabled,
    });
    onclickClose();
  }

  async function clickDelete() {
    if (!onDelete) return;
    await onDelete();
    onclickClose();
  }
</script>

<Popup
  type="m"
  title={isEdit
    ? t("nt_settings_search_edit_engine")
    : t("nt_settings_search_add_engine")}
  {onclickClose}
>
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
    />
  </G>
  <G full vertical>
    <T type="s" color="var(--c-text-1)">
      {t("nt_settings_search_engine_category")}
    </T>
    <Select options={popupCategoryOptions} onChange={setCategory} />
  </G>
  <div class="switch_row">
    <G vertical full>
      <T>{t("nt_settings_search_engine_enabled")}</T>
    </G>
    <div
      class="switch_wrap"
      role="button"
      tabindex={saving ? -1 : 0}
      aria-disabled={saving}
      onclick={() => !saving && (enabled = !enabled)}
      onkeydown={(e) => {
        if (saving) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          enabled = !enabled;
        }
      }}
    >
      <Switch turnOn={enabled} disabled={saving} />
    </div>
  </div>
  {#if inputError}
    <G full>
      <T type="s" color="var(--c-red)">{inputError}</T>
    </G>
  {/if}
  <G full>
    <Button fill full onclick={() => void clickSave()}>
      <G full>
        <T align="c" color="var(--c-bg)">{t("nt_save")}</T>
      </G>
    </Button>
  </G>
  {#if isEdit && onDelete}
    <G full>
      <Button full onclick={() => void clickDelete()}>
        <G full>
          <T align="c">{t("nt_delete")}</T>
        </G>
      </Button>
    </G>
  {/if}
</Popup>

<style>
  .switch_row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    box-sizing: border-box;
    background-color: var(--c-mask);
    border-radius: var(--r1);
    padding: var(--gap);
    gap: var(--gap);
  }
  .switch_wrap {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .switch_wrap:focus-visible {
    outline: 2px solid var(--c-text);
    border-radius: var(--r);
  }
</style>
