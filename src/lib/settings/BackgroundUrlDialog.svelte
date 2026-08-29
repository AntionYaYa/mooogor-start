<script lang="ts">
  import { isBackgroundUrl } from "@/lib/background/background";
  import Button from "@/lib/components/Button.svelte";
  import G from "@/lib/components/G.svelte";
  import Input from "@/lib/components/Input.svelte";
  import Icon from "@/lib/components/Icon.svelte";
  import Popup from "@/lib/components/Popup.svelte";
  import Shake from "@/lib/components/Shake.svelte";
  import T from "@/lib/components/T.svelte";
  import { t } from "@/lib/utils/i18n";

  interface Props {
    onclickClose: () => void;
    onConfirm: (url: string) => Promise<void>;
  }

  let { onclickClose, onConfirm }: Props = $props();
  let url = $state("");
  let urlInvalid = $state(false);
  let submitting = $state(false);

  function close() {
    if (!submitting) onclickClose();
  }

  async function confirm() {
    if (submitting) return;
    const value = url.trim();
    urlInvalid = false;
    if (!isBackgroundUrl(value)) {
      urlInvalid = true;
      return;
    }
    submitting = true;
    try {
      await onConfirm(value);
    } finally {
      submitting = false;
      onclickClose();
    }
  }
</script>

<Popup
  type="m"
  title={t("nt_settings_background_add")}
  onclickClose={close}
>
  <div class="dialog">
    <Shake shake={urlInvalid}>
      <Input
        name="background-url"
        type="url"
        bind:value={url}
        placeholder={t("nt_settings_background_url")}
        disabled={submitting}
      />
    </Shake>
    <div class="actions">
      <Button full fill r="r1" onclick={close} disabled={submitting}>
        <G align="c"><T>{t("nt_cancel")}</T></G>
      </Button>
      <Button
        full
        r="r1"
        bg="var(--c-text)"
        onclick={() => void confirm()}
        disabled={submitting}
      >
        <G align="c">
          {#if submitting}
            <Icon name="Loading" color="var(--c-bg)" />
          {:else}
            <T color="var(--c-bg)">{t("nt_confirm")}</T>
          {/if}
        </G>
      </Button>
    </div>
  </div>
</Popup>

<style>
  .dialog {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: var(--gap);
    padding: var(--gap);
    box-sizing: border-box;
  }

  .actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--gap);
    width: 100%;
  }
</style>
