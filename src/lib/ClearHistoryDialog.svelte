<script lang="ts">
  import { t } from "@/lib/utils/i18n";
  import Popup from "./components/Popup.svelte";
  import Button from "./components/Button.svelte";
  import G from "./components/G.svelte";
  import T from "./components/T.svelte";
  import Icon from "./components/Icon.svelte";

  interface Props {
    options: { key: string; label: string }[];
    onclickClose: () => void;
    onConfirm: (key: string) => void | Promise<void>;
  }

  let { options, onclickClose, onConfirm }: Props = $props();

  let selectedKey = $state<string>("");
  let submitting = $state(false);

  const canConfirm = $derived(!!selectedKey && !submitting);

  $effect(() => {
    selectedKey = options[0]?.key ?? "";
  });

  function selectKey(key: string) {
    selectedKey = key;
  }

  async function handleConfirm() {
    if (!canConfirm) return;
    submitting = true;
    try {
      await onConfirm(selectedKey);
    } finally {
      submitting = false;
    }
  }
</script>

<Popup type="m" title={t("nt_history_clear_title")} {onclickClose}>
    <G>
    <div class="list">
      {#each options as option}
        <Button full fill={selectedKey === option.key} r="r_o" onclick={() => selectKey(option.key)}>
          <div class="option">
            <G full>
              <T>{option.label}</T>
            </G>
            {#if selectedKey === option.key}
              <Icon name="Check" color="var(--c-green)" opacity={0.6} />
            {/if}
          </div>
        </Button>
      {/each}
    </div>
    </G>
    <div class="actions">
      <Button
        bg="var(--c-text)"
        disabled={!canConfirm}
        onclick={() => void handleConfirm()}
        r="r1"
      >
        <G full>
          <G full>
            <T align="c" color="var(--c-bg)">
              {submitting ? t("nt_history_clearing") : t("nt_confirm")}
            </T>
          </G>
        </G>
      </Button>
      <Button fill r="r1" onclick={onclickClose}>
        <G align="c">
          <G>
            <T align="c">{t("nt_cancel")}</T>
          </G>
        </G>
      </Button>
    </div>
</Popup>

<style>
  /* .body {
    width: 100%;
    display: flex;
    flex-direction: column;
  } */

  .list {
    display: flex;
    flex-direction: column;
    gap: var(--gap);
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
    background-color: var(--c-mask);
    border-radius: var(--r1);
    max-height: 480px;
    overflow-y: auto;
  }

  .option {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--gap);
    padding: var(--gap);
    box-sizing: border-box;
  }
  .actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
    flex-direction: row-reverse;
  }
</style>
