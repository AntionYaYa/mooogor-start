<script lang="ts">
  import { onMount } from "svelte";
  import validator from "validator";
  import type { BookmarkNode } from "@/lib/browser/bookmarks";
  import Button from "./components/Button.svelte";
  import G from "./components/G.svelte";
  import Input from "./components/Input.svelte";
  import Popup from "./components/Popup.svelte";
  import Shake from "./components/Shake.svelte";
  import T from "./components/T.svelte";
  import { t } from "@/lib/utils/i18n";

  interface Props {
    bookmark: BookmarkNode;
    onSave: (nextValue: { title: string; url?: string }) => void | Promise<void>;
    onDelete: () => boolean | void | Promise<boolean | void>;
    onclickClose: () => void;
  }

  let { bookmark, onSave, onDelete, onclickClose }: Props = $props();

  const isFolder = $derived(!bookmark.url);
  let inputTitleValue = $state("");
  let inputUrlValue = $state("");
  let inputUrlValueErr = $state(false);

  onMount(() => {
    inputTitleValue = bookmark.title ?? "";
    inputUrlValue = bookmark.url ?? "";
  });

  async function clickSave() {
    inputUrlValueErr = false;
    if (!isFolder && !validator.isURL(inputUrlValue)) {
      inputUrlValueErr = true;
      return;
    }
    await onSave({
      title: inputTitleValue.trim(),
      url: isFolder ? undefined : inputUrlValue.trim(),
    });
    onclickClose();
  }

  async function clickDelete() {
    const deleted = await onDelete();
    if (deleted !== false) onclickClose();
  }
</script>

<Popup
  type="s"
  title={isFolder ? t("nt_edit_bookmark_folder_title") : t("nt_edit_bookmark_title")}
  {onclickClose}
>
  {#if !isFolder}
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
  {/if}
  <G full>
    <Input
      name="title"
      type="text"
      placeholder={t("nt_input_name")}
      bind:value={inputTitleValue}
    />
  </G>
  <div class="actions">
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
</Popup>

<style>
  .actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--gap);
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
  }
  .actions_right {
    display: flex;
    align-items: center;
    gap: var(--gap);
  }
</style>
