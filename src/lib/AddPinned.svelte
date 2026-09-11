<script lang="ts">
  import { onMount } from "svelte";
  import validator from "validator";
  import type { WebSite, WebSiteFolder } from "@/lib/DB/DB";
  import { getDomainFromUrl } from "@/lib/DB/DB";
  import Button from "./components/Button.svelte";
  import Icon from "./components/Icon.svelte";
  import Input from "./components/Input.svelte";
  import G from "./components/G.svelte";
  import T from "./components/T.svelte";
  import Popup from "./components/Popup.svelte";
  import Shake from "./components/Shake.svelte";
  import { t } from "@/lib/utils/i18n";
  import Select from "./components/Select.svelte";
  import { getWebsiteCardColors } from "@/lib/utils/websiteCardColors";

  interface Props {
    isEdit?: boolean;
    urlValue?: string;
    titleValue?: string;
    folderIdValue?: number;
    folders?: WebSiteFolder[];
    onSave: (newWebSite: WebSite) => void | Promise<void>;
    onSaveFolder?: (title: string) => void | Promise<void>;
    onDelete?: () => boolean | void | Promise<boolean | void>;
    onclickClose: () => void;
  }

  let {
    isEdit = false,
    urlValue,
    titleValue,
    folderIdValue,
    folders = [],
    onSave,
    onSaveFolder,
    onDelete,
    onclickClose,
  }: Props = $props();
  let saving = $state(false);
  let saveError = $state(false);
  let inputUrlValue = $state("");
  let inputTitleValue = $state("");
  let inputUrlValueErr = $state(false);
  let inputTitleValueErr = $state(false);
  let addType: "website" | "folder" = $state("website");
  let selectedFolderId = $state("");
  let folderOptions = $derived([
    { label: t("nt_no_folder"), value: "", sel: selectedFolderId === "" },
    ...folders.flatMap((folder) => folder.id == null ? [] : [{
      label: folder.title,
      value: String(folder.id),
      sel: selectedFolderId === String(folder.id),
    }]),
  ]);

  onMount(() => {
    if (urlValue) {
      inputUrlValue = urlValue;
    }
    if (titleValue) {
      inputTitleValue = titleValue;
    }
    selectedFolderId = folderIdValue == null ? "" : String(folderIdValue);
  });

  function selectAddType(nextType: "website" | "folder") {
    addType = nextType;
    inputUrlValueErr = false;
    inputTitleValueErr = false;
  }

  function closeEditor() {
    if (!saving) onclickClose();
  }

  async function clickSave() {
    if (saving) return;
    saveError = false;
    saving = true;
    try {
      inputUrlValueErr = false;
      inputTitleValueErr = false;
      if (addType === "folder") {
        const title = inputTitleValue.trim();
        if (!title || !onSaveFolder) {
          inputTitleValueErr = true;
          return;
        }
        await onSaveFolder(title);
        inputTitleValue = "";
        onclickClose();
        return;
      }
      if (validator.isURL(inputUrlValue)) {
        const domain = getDomainFromUrl(inputUrlValue);
        const newWebSite = {
          domain,
          url: inputUrlValue,
          title: inputTitleValue.trim(),
          folderId: selectedFolderId ? Number(selectedFolderId) : undefined,
          ...(await getWebsiteCardColors(inputUrlValue, domain)),
        };
        await onSave(newWebSite);
        inputUrlValue = inputTitleValue = "";
        onclickClose();
      } else {
        inputUrlValueErr = true;
      }
    } catch {
      saveError = true;
    } finally {
      saving = false;
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
  title={isEdit
    ? t("nt_edit_pinned_title")
    : addType === "folder"
      ? t("nt_create_folder")
      : t("nt_add_pinned_title")}
  onclickClose={closeEditor}
>
  {#if !isEdit && onSaveFolder}
    <div class="type_switch" role="group" aria-label={t("nt_add_pinned_title")}>
      <Button disabled={saving}
        fill={addType === "website"}
        r="r_o"
        align="c"
        onclick={() => selectAddType("website")}
      >
        <G align="c">
          <Icon name="Globe" color="var(--c-text)" size={18} />
          <T nowrap>{t("nt_website")}</T>
        </G>
      </Button>
      <Button disabled={saving}
        fill={addType === "folder"}
        r="r_o"
        align="c"
        onclick={() => selectAddType("folder")}
      >
        <G align="c">
          <Icon name="PlayingCardsFan" color="var(--c-text)" size={18} />
          <T nowrap>{t("nt_folder")}</T>
        </G>
      </Button>
    </div>
  {/if}

  <G full>
    <Input
      name="title"
      type="text"
      placeholder={addType === "folder" ? t("nt_folder_name") : t("nt_input_name")}
      err={inputTitleValueErr ? t("nt_folder_name_required") : undefined}
      disabled={saving}
      bind:value={inputTitleValue}
    />
  </G>
  <div
    class="website_fields"
    class:hidden={addType === "folder"}
    aria-hidden={addType === "folder"}
  >
    <G full>
      <Shake shake={inputUrlValueErr}>
        <Input
          name="url"
          type="url"
          placeholder={t("nt_input_url")}
          bind:value={inputUrlValue}
          disabled={saving || addType === "folder"}
        />
      </Shake>
    </G>
    {#if folders.length}
      <G full>
        <Select
          options={folderOptions}
          onChange={(value) => (selectedFolderId = value)}
          disabled={saving || addType === "folder"}
        />
      </G>
    {/if}
  </div>
  {#if saveError}
    <div role="alert"><G full><T color="var(--c-red)">{t("nt_common_save_failed")}</T></G></div>
  {/if}
  {#if isEdit && onDelete}
    <div class="actions has_delete">
      <Button disabled={saving} fill r="r1" onclick={() => void clickDelete()}>
        <G align="c">
          <G>
            <T align="c" color="var(--c-red)">{t("nt_delete")}</T>
          </G>
        </G>
      </Button>
      <div class="actions_right">
        <Button disabled={saving} fill r="r1" onclick={closeEditor}>
          <G><G><T align="c">{t("nt_cancel")}</T></G></G>
        </Button>
        <Button disabled={saving} bg="var(--c-text)" onclick={() => void clickSave()} r="r1">
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
      <Button disabled={saving} fill r="r1" onclick={closeEditor}>
        <G><G><T align="c">{t("nt_cancel")}</T></G></G>
      </Button>
      <Button disabled={saving} bg="var(--c-text)" onclick={() => void clickSave()} r="r1">
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
  .type_switch {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px;
    width: calc(100% - var(--gap) * 2);
    margin: var(--gap);
    padding: 2px;
    border: 2px solid var(--c-mask);
    border-radius: var(--r1);
    box-sizing: border-box;
  }
  .website_fields {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  .website_fields.hidden {
    visibility: hidden;
    pointer-events: none;
  }
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
