<script lang="ts">
  import ContextMenu from "./components/Popover.svelte";
  import Button from "./components/Button.svelte";
  import Divider from "./components/Divider.svelte";
  import T from "./components/T.svelte";
  import G from "./components/G.svelte";
  import { t } from "@/lib/utils/i18n";

  interface Props {
    children?: any;
    x?: number;
    y?: number;
    url: string;
    showDefaultActions?: boolean;
    onClose: () => void;
  }

  let { children, x, y, url, showDefaultActions = true, onClose }: Props = $props();

  function openNewTab() {
    if (!url) return;
    window.open(url, "_blank");
    onClose();
  }

  function openNewWindow() {
    if (!url) return;
    browser.windows.create({ url });
    onClose();
  }

  function openIncognitoWindow() {
    if (!url) return;
    browser.windows.create({
      url,
      incognito: true,
    });
    onClose();
  }

  async function copyLink() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    onClose();
  }
</script>

<ContextMenu {x} {y} {onClose}>
  {#if showDefaultActions}
    <Button full onclick={openNewTab}>
      <G>
        <T>{t("nt_open_new_tab")}</T>
      </G>
    </Button>
    <Button full onclick={openNewWindow}>
      <G>
        <T>{t("nt_open_new_window")}</T>
      </G>
    </Button>
    <Button full onclick={openIncognitoWindow}>
      <G>
        <T>{t("nt_open_incognito")}</T>
      </G>
    </Button>
    <Button full onclick={copyLink}>
      <G>
        <T>{t("nt_copy_link")}</T>
      </G>
    </Button>
  {/if}
  {#if children}
    {#if showDefaultActions}
    <Divider />
    {/if}
    {@render children()}
  {/if}
</ContextMenu>
