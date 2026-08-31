<script lang="ts">
  import { onMount } from "svelte";
  import Button from "@/lib/components/Button.svelte";
  import G from "@/lib/components/G.svelte";
  import Switch from "@/lib/components/Switch.svelte";
  import T from "@/lib/components/T.svelte";
  import { formatDateTime, t } from "@/lib/utils/i18n";
  import Icon from "@/lib/components/Icon.svelte";
  import {
    getDataSyncState,
    retryDataSync,
    setDataSyncEnabled,
    type DataSyncState,
  } from "@/lib/sync/dataSync";
  import { browser } from "wxt/browser";
  import Divider from "../components/Divider.svelte";

  let syncState = $state<DataSyncState>({
    enabled: false,
    lastSyncedAt: null,
    phase: "idle",
    errorCode: null,
    usedBytes: 0,
    quotaBytes: 102_400,
    localUsedBytes: 0,
    localQuotaBytes: 10_485_760,
  });
  let loading = $state(true);
  let saving = $state(false);
  let error = $state(false);

  onMount(() => {
    void refresh();
    const handleStorageChanged = (
      _changes: Record<string, unknown>,
      areaName: string,
    ) => {
      if (!saving && (areaName === "sync" || areaName === "local")) {
        void refresh();
      }
    };
    browser.storage.onChanged.addListener(handleStorageChanged);
    return () => browser.storage.onChanged.removeListener(handleStorageChanged);
  });

  async function refresh() {
    loading = true;
    error = false;
    try {
      syncState = await getDataSyncState();
    } catch (cause) {
      error = true;
      console.error("[Mooogor Data Sync]", "state:failed", cause);
    } finally {
      loading = false;
    }
  }

  async function toggleSync() {
    if (loading || saving) return;
    saving = true;
    error = false;
    try {
      syncState = await setDataSyncEnabled(!syncState.enabled);
    } catch (cause) {
      error = true;
      console.error("[Mooogor Data Sync]", "toggle:failed", cause);
    } finally {
      saving = false;
    }
  }

  async function retrySync() {
    if (loading || saving) return;
    saving = true;
    error = false;
    try {
      syncState = await retryDataSync();
    } catch (cause) {
      error = true;
      console.error("[Mooogor Data Sync]", "retry:failed", cause);
    } finally {
      saving = false;
    }
  }

  function formatLastSync(value: number | null) {
    if (!value) return t("nt_settings_data_sync_not_yet");
    return formatDateTime(value);
  }

  function formatBytes(value: number) {
    if (value < 1024) return `${value} B`;
    return `${(value / 1024).toFixed(1)} KB`;
  }

  function usagePercent(usedBytes: number, quotaBytes: number) {
    if (quotaBytes <= 0) return 0;
    return Math.min(100, Math.round((usedBytes / quotaBytes) * 100));
  }

  function usagePercentLabel(usedBytes: number, quotaBytes: number) {
    if (quotaBytes <= 0 || usedBytes <= 0) return "0%";
    const percent = (usedBytes / quotaBytes) * 100;
    return percent < 1 ? "<1%" : `${Math.min(100, Math.round(percent))}%`;
  }
</script>

<div class="data_sync_settings">
  <G vertical full>
    <T type="s" color="var(--c-text-1)">
      {t("nt_settings_data_local_usage")}
    </T>
    <G vertical full>
      <progress
        class:warning={usagePercent(
          syncState.localUsedBytes,
          syncState.localQuotaBytes,
        ) >= 80}
        max={syncState.localQuotaBytes}
        value={syncState.localUsedBytes}
        aria-label={t("nt_settings_data_local_usage")}
      ></progress>
    </G>
    <T type="s" color="var(--c-text-2)" nowrap>
      {formatBytes(syncState.localUsedBytes)} /
      {formatBytes(syncState.localQuotaBytes)}
      ({usagePercentLabel(syncState.localUsedBytes, syncState.localQuotaBytes)})
    </T>
  </G>
  <Divider />

  <G vertical>
    <Button full fill r="r1" disabled={loading || saving} onclick={toggleSync}>
      <G full>
        <G full align="c">
          <T>{t("nt_settings_data_sync_switch")}</T>
          <Switch turnOn={syncState.enabled} disabled={loading || saving} />
        </G>
      </G>
    </Button>
    <G full>
      <T type="s" color="var(--c-text-1)">
        {t("nt_settings_data_sync_syncs")}
      </T>
    </G>
  </G>

  <G vertical full>
    <T type="s" color="var(--c-text-1)">
      {t("nt_settings_data_sync_usage")}
    </T>
    <G vertical full>
      <progress
        class:warning={usagePercent(
          syncState.usedBytes,
          syncState.quotaBytes,
        ) >= 80}
        max={syncState.quotaBytes}
        value={syncState.usedBytes}
        aria-label={t("nt_settings_data_sync_usage")}
      ></progress>
    </G>
    <T type="s" color="var(--c-text-2)" nowrap>
      {formatBytes(syncState.usedBytes)} / {formatBytes(syncState.quotaBytes)}
      ({usagePercentLabel(syncState.usedBytes, syncState.quotaBytes)})
    </T>
  </G>

  {#if syncState.enabled}
    {#if syncState.phase === "pending"}
      <G>
        <Icon name="Loading" color="var(--c-text)" />
        <T>{t("nt_settings_data_sync_pending")}</T>
      </G>
    {:else if syncState.phase === "error"}
      <G vertical>
        <G>
          <Icon name="TriangleAlert" color="var(--c-red)" />
        </G>
        <T>{t("nt_settings_data_sync_error")}</T>
        <G>
          <Button fill r="r1" onclick={retrySync} disabled={saving}>
            <G>
              <T>{t("nt_settings_data_sync_retry")}</T>
            </G>
          </Button>
        </G>
      </G>
    {:else}
      <G vertical>
        <T type="s" color="var(--c-text-1)">{t("nt_settings_data_sync_last")}</T
        >
        <T>{formatLastSync(syncState.lastSyncedAt)}</T>
      </G>
    {/if}
  {/if}

  {#if error && syncState.phase !== "error"}
    <G vertical>
      <G>
        <Icon name="TriangleAlert" color="var(--c-red)" />
      </G>
      <T>{t("nt_settings_data_sync_error")}</T>
    </G>
  {/if}
</div>

<style>
  .data_sync_settings {
    display: flex;
    flex-direction: column;
    width: 300px;
    padding: var(--gap);
    gap: calc(var(--gap) * 2);
    box-sizing: border-box;
  }
  progress {
    width: 100%;
    height: 10px;
    overflow: hidden;
    border: 0;
    border-radius: var(--r1);
    background-color: var(--c-mask);
  }
  progress::-webkit-progress-bar {
    border-radius: var(--r1);
    background-color: var(--c-mask);
  }
  progress::-webkit-progress-value {
    border-radius: var(--r1);
    background-color: var(--c-main);
    transition: width 0.2s ease-out;
  }
  progress.warning::-webkit-progress-value {
    background-color: var(--c-red);
  }
</style>
