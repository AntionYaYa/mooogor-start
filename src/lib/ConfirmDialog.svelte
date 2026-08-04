<script lang="ts">
  import Popup from "./components/Popup.svelte";
  import Button from "./components/Button.svelte";
  import G from "./components/G.svelte";
  import T from "./components/T.svelte";
  import { t } from "@/lib/utils/i18n";

  interface Props {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onclickClose: () => void;
    onConfirm: () => void | Promise<void>;
  }

  let {
    title,
    description,
    confirmText = t("nt_confirm"),
    cancelText = t("nt_cancel"),
    onclickClose,
    onConfirm,
  }: Props = $props();

  let danger = $derived(confirmText === t("nt_delete"));
</script>

<Popup type="s" title="" hideHeader {onclickClose}>
  <div class="message">
    <G full>
      <T type="l">{title}</T>
    </G>
    <G full>
      <T type="s">{description}</T>
    </G>
  </div>
  <div class="actions">
    <Button fill r="r1" onclick={onclickClose}>
      <G align="c">
        <G>
          <T align="c">{cancelText}</T>
        </G>
      </G>
    </Button>
    <Button
      bg={danger ? "var(--c-red)" : "var(--c-text)"}
      onclick={() => void onConfirm()}
      r="r1"
    >
      <G full>
        <G full>
          <T align="c" color={danger ? "#fff" : "var(--c-bg)"}>{confirmText}</T>
        </G>
      </G>
    </Button>
  </div>
</Popup>

<style>
  .message {
    width: 100%;
    box-sizing: border-box;
    white-space: pre-line;
    padding: var(--gap);
  }
  .actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--gap);
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
  }
</style>
