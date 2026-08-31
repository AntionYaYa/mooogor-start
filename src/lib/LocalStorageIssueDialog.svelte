<script lang="ts">
  import Popup from "@/lib/components/Popup.svelte";
  import Button from "@/lib/components/Button.svelte";
  import G from "@/lib/components/G.svelte";
  import T from "@/lib/components/T.svelte";
  import { t } from "@/lib/utils/i18n";
  import type { LocalStorageHealthState } from "@/lib/storage/localStorageHealth";

  interface Props {
    errorCode: LocalStorageHealthState["errorCode"];
    onclickClose: () => void;
  }

  let { errorCode, onclickClose }: Props = $props();
</script>

<Popup
  type="s"
  title={t("nt_local_storage_error_title")}
  {onclickClose}
>
  <div class="issue">
    <T>
      {t(
        errorCode === "quota"
          ? "nt_local_storage_error_quota"
          : "nt_local_storage_error_write",
      )}
    </T>
    <Button full fill r="r1" align="c" onclick={onclickClose}>
      <G align="c">
        <T align="c">{t("nt_confirm")}</T>
      </G>
    </Button>
  </div>
</Popup>

<style>
  .issue {
    display: flex;
    flex-direction: column;
    gap: var(--gap);
    width: 100%;
    padding-top: var(--gap);
    box-sizing: border-box;
  }
</style>
