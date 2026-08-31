<script lang="ts">
  import Popup from "@/lib/components/Popup.svelte";
  import Button from "@/lib/components/Button.svelte";
  import G from "@/lib/components/G.svelte";
  import Icon from "@/lib/components/Icon.svelte";
  import T from "@/lib/components/T.svelte";
  import { t } from "@/lib/utils/i18n";
  import type { DataSyncState } from "@/lib/sync/dataSync";

  interface Props {
    errorCode: DataSyncState["errorCode"];
    retrying?: boolean;
    onclickClose: () => void;
    onRetry: () => void | Promise<void>;
  }

  let { errorCode, retrying = false, onclickClose, onRetry }: Props = $props();

  function solutionKey() {
    if (errorCode === "quota") return "nt_data_sync_error_quota";
    if (errorCode === "rate") return "nt_data_sync_error_rate";
    return "nt_data_sync_error_unknown";
  }
</script>

<Popup type="s" title={t("nt_data_sync_error_title")} {onclickClose}>
  <G vertical>
    <T type='m'>{t(solutionKey())}</T>
  </G>
  <G vertical align="r">
    <Button
      fill
      r="r1"
      align="c"
      disabled={retrying}
      onclick={() => void onRetry()}
    >
      <G align="c">
        <G align="c">
          {#if retrying}
            <Icon name="Loading" color="var(--c-text)" />
          {:else}
            <T align="c">
              {retrying
                ? t("nt_data_sync_retrying")
                : t("nt_settings_data_sync_retry")}
            </T>
          {/if}
        </G>
      </G>
    </Button>
  </G>
</Popup>
