<script lang="ts">
  import { onMount } from "svelte";
  import validator from "validator";
  import type { WebSite } from "@/lib/DB/DB";
  import { getDomainFromUrl } from "@/lib/DB/DB";
  import Button from "./components/Button.svelte";
  import Input from "./components/Input.svelte";
  import G from "./components/G.svelte";
  import T from "./components/T.svelte";
  import Popup from "./components/Popup.svelte";
  import Shake from "./components/Shake.svelte";
  import { t } from "@/lib/utils/i18n";

  interface Props {
    isEdit?: boolean;
    urlValue?: string;
    titleValue?: string;
    onSave: (newWebSite: WebSite) => void | Promise<void>;
    onDelete?: () => boolean | void | Promise<boolean | void>;
    onclickClose: () => void;
  }

  let {
    isEdit = false,
    urlValue,
    titleValue,
    onSave,
    onDelete,
    onclickClose,
  }: Props = $props();
  let inputUrlValue = $state("");
  let inputTitleValue = $state("");
  let inputUrlValueErr = $state(false);

  onMount(() => {
    if (urlValue) {
      inputUrlValue = urlValue;
    }
    if (titleValue) {
      inputTitleValue = titleValue;
    }
  });

  async function clickSave() {
    inputUrlValueErr = false;
    if (validator.isURL(inputUrlValue)) {
      const newWebSite = {
        domain: getDomainFromUrl(inputUrlValue),
        url: inputUrlValue,
        title: inputTitleValue.trim(),
      };
      await onSave(newWebSite);
      inputUrlValue = inputTitleValue = "";
      onclickClose();
    } else {
      inputUrlValueErr = true;
    }
  }

  async function clickDelete() {
    if (!onDelete) return;
    const deleted = await onDelete();
    if (deleted !== false) onclickClose();
  }
</script>

<Popup
  type="s"
  title={isEdit ? t("nt_edit_pinned_title") : t("nt_add_pinned_title")}
  {onclickClose}
>

  <G full>
    <Input
      name="title"
      type="text"
      placeholder={t("nt_input_name")}
      bind:value={inputTitleValue}
    />
  </G>
    <G full>
    <Shake shake={inputUrlValueErr}>
      <Input
        name="url"
        type="url"
        placeholder={t("nt_input_url")}
        bind:value={inputUrlValue}
      />
    </Shake>
  </G>
  {#if isEdit && onDelete}
    <div class="actions has_delete">
      <Button fill r="r1" onclick={() => void clickDelete()}>
        <G align="c">
          <G>
            <T align="c" color="var(--c-red)">{t("nt_delete")}</T>
          </G>
        </G>
      </Button>
      <div class="actions_right">
        <Button fill r="r1" onclick={onclickClose}>
          <G><G><T align="c">{t("nt_cancel")}</T></G></G>
        </Button>
        <Button bg="var(--c-text)" onclick={() => void clickSave()} r="r1">
          <G full>
            <G full>
              <T align="c" color="var(--c-bg)">{t("nt_save")}</T>
            </G>
          </G>
        </Button>
      </div>
    </div>
  {:else}
    <div class="actions">
      <Button fill r="r1" onclick={onclickClose}>
        <G><G><T align="c">{t("nt_cancel")}</T></G></G>
      </Button>
      <Button bg="var(--c-text)" onclick={() => void clickSave()} r="r1">
        <G full>
          <G full>
            <T align="c" color="var(--c-bg)">{t("nt_save")}</T>
          </G>
        </G>
      </Button>
    </div>
  {/if}
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
