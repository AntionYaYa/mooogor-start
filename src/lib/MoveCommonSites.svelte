<script lang="ts">
  import { onMount } from "svelte";
  import type { WebSiteFolder } from "./DB/DB";
  import Popup from "./components/Popup.svelte";
  import Button from "./components/Button.svelte";
  import Icon from "./components/Icon.svelte";
  import G from "./components/G.svelte";
  import T from "./components/T.svelte";
  import { t } from "./utils/i18n";
  let { folders, currentFolderId, onSave, onclickClose }: {
    folders: WebSiteFolder[]; currentFolderId?: number;
    onSave: (folderId?: number) => void | Promise<void>; onclickClose: () => void;
  } = $props();
  let selected = $state<string | undefined>();
  let saving = $state(false);
  let failed = $state(false);
  let targets = $derived([
    ...(currentFolderId == null ? [] : [{ value: "", label: t("nt_no_folder") }]),
    ...folders.flatMap((folder) => folder.id == null || folder.id === currentFolderId ? [] : [{ value: String(folder.id), label: folder.title }]),
  ]);
  onMount(() => {
    selected = targets[0]?.value;
  });
  function close() { if (!saving) onclickClose(); }
  async function save() {
    if (saving || selected === undefined) return;
    saving = true; failed = false;
    try { await onSave(selected === "" ? undefined : Number(selected)); onclickClose(); }
    catch { failed = true; }
    finally { saving = false; }
  }
</script>

<Popup type="s" title={t("nt_move")} onclickClose={close}>
  <G full>
    <div class="targets" role="group" aria-label={t("nt_move")}>
      {#each targets as target (target.value)}
        <button type="button" class="target" class:selected={selected === target.value} aria-pressed={selected === target.value}
          disabled={saving} onclick={() => (selected = target.value)}>
          <G full align="c">
            {#if target.value !== ""}
              <Icon name="PlayingCardsFan" color={selected === target.value ? "var(--c-main)" : "var(--c-text)"} />
            {/if}
            <T nowrap color={selected === target.value ? "var(--c-main)" : "var(--c-text)"}>{target.label}</T>
          </G>
          {#if selected === target.value}<G><Icon name="Check" color="var(--c-main)" /></G>{/if}
        </button>
      {/each}
    </div>
  </G>
  {#if failed}<div role="alert"><G><T color="var(--c-red)">{t("nt_common_action_failed")}</T></G></div>{/if}
  <div class="actions">
    <Button fill r="r1" disabled={saving} onclick={close}><G><G><T align="c">{t("nt_cancel")}</T></G></G></Button>
    <Button bg="var(--c-text)" r="r1" disabled={saving || selected === undefined} onclick={() => void save()}><G full><G full><T align="c" color="var(--c-bg)">{t("nt_confirm")}</T></G></G></Button>
  </div>
</Popup>

<style>
  .targets { display: flex; flex-direction: column; width: 100%; max-height: 360px; min-height: 40px; overflow-y: auto; gap: var(--gap); padding: var(--gap); border: 2px solid var(--c-mask); border-radius: var(--r1); box-sizing: border-box; }
  .target { display: flex; align-items: center; width: 100%; min-height: 40px; min-width: 0; padding: 0 var(--gap); border: 0; border-radius: var(--r); background: transparent; cursor: default; }
  .target:active { background: var(--c-mask); }
  .target.selected { background: var(--c-bg1); }
  .target:focus-visible { outline: 2px solid var(--c-main); outline-offset: -2px; }
  .actions { display: flex; justify-content: flex-end; gap: var(--gap); width: 100%; padding: var(--gap); box-sizing: border-box; }
</style>
