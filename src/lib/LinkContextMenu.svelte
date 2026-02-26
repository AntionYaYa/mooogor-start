<script lang="ts">
  import ContextMenu from "./components/Popover.svelte";
  import Button from "./components/Button.svelte";
  import Divider from "./components/Divider.svelte";
  import T from "./components/T.svelte";
  import { t } from "@/lib/utils/i18n";

  interface Props {
    children?: any;
    x?: number;
    y?: number;
    url: string;
    onClose: () => void;
  }

  let {children, x, y, url, onClose }: Props = $props();

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
  <Button full onclick={openNewTab}>
    <T>{t("nt_open_new_tab")}</T>
  </Button>
  <Button full onclick={openNewWindow}>
    <T>{t("nt_open_new_window")}</T>
  </Button>
  <Button full onclick={openIncognitoWindow}>
    <T>{t("nt_open_incognito")}</T>
  </Button>
  <Button full onclick={copyLink}>
    <T>{t("nt_copy_link")}</T>
  </Button>
  {#if children}
    <Divider/>
    {@render children()}
  {/if}
</ContextMenu>
