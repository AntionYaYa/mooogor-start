<script lang="ts">
  import type { WebSiteFolder } from "./DB/DB";
  import { deleteWebSiteFolder, deleteWebSiteGroupWithSites, updateWebSiteFolder } from "./DB/websiteFolders";
  import Popover from "./components/Popover.svelte";
  import Popup from "./components/Popup.svelte";
  import ConfirmDialog from "./ConfirmDialog.svelte";
  import Button from "./components/Button.svelte";
  import Input from "./components/Input.svelte";
  import G from "./components/G.svelte";
  import T from "./components/T.svelte";
  import { t } from "./utils/i18n";

  let { group, x, y, onClose, onUpdate }: {
    group: WebSiteFolder;
    x: number;
    y: number;
    onClose: () => void;
    onUpdate: () => void | Promise<void>;
  } = $props();
  let mode = $state<"menu" | "rename" | "delete">("menu");
  let name = $state("");
  let invalid = $state(false);
  let busy = $state(false);
  let failed = $state(false);

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy() { node.remove(); } };
  }

  function close() { if (!busy) onClose(); }
  function rename() {
    name = group.title;
    invalid = failed = false;
    mode = "rename";
  }
  async function run(action: "rename" | "ungroup" | "delete") {
    if (busy || group.id == null) return;
    if (action === "rename" && !name.trim()) { invalid = true; return; }
    busy = true;
    failed = false;
    try {
      if (action === "rename") await updateWebSiteFolder({ ...group, id: group.id, title: name.trim() });
      else if (action === "ungroup") await deleteWebSiteFolder(group.id);
      else await deleteWebSiteGroupWithSites(group.id);
    } catch {
      failed = true;
      busy = false;
      return;
    }
    busy = false;
    onClose();
    await onUpdate();
  }
</script>

{#if mode === "menu"}
  <div use:portal>
  <Popover {x} {y} onClose={close}>
    <Button full disabled={busy} onclick={rename}><G><T>{t("nt_group_rename")}</T></G></Button>
    <Button full disabled={busy} onclick={() => void run("ungroup")}><G><T>{t("nt_group_ungroup")}</T></G></Button>
    <Button full disabled={busy} onclick={() => { failed = false; mode = "delete"; }}><G><T color="var(--c-red)">{t("nt_delete")}</T></G></Button>
    {#if failed}<div role="alert"><T color="var(--c-red)">{t("nt_common_action_failed")}</T></div>{/if}
  </Popover>
  </div>
{:else if mode === "rename"}
  <Popup type="s" title={t("nt_group_rename")} onclickClose={close}>
    <G full><Input name="group-name" type="text" bind:value={name} disabled={busy}
      placeholder={t("nt_folder_name")} err={invalid ? t("nt_folder_name_required") : undefined} /></G>
    {#if failed}<div role="alert"><G><T color="var(--c-red)">{t("nt_common_action_failed")}</T></G></div>{/if}
    <div class="actions">
      <Button fill r="r1" disabled={busy} onclick={close}><G><G><T align="c">{t("nt_cancel")}</T></G></G></Button>
      <Button bg="var(--c-text)" r="r1" disabled={busy} onclick={() => void run("rename")}><G full><G full><T align="c" color="var(--c-bg)">{t("nt_save")}</T></G></G></Button>
    </div>
  </Popup>
{:else}
  <ConfirmDialog title={t("nt_group_delete")} description={t("nt_group_delete_confirm") + (failed ? "\n" + t("nt_common_action_failed") : "")}
    confirmText={t("nt_delete")} onclickClose={close} onConfirm={() => run("delete")} />
{/if}

<style>
  .actions { display: flex; justify-content: flex-end; gap: var(--gap); width: 100%; padding: var(--gap); box-sizing: border-box; }
</style>
