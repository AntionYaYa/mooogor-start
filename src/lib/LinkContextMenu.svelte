<script lang="ts">
  import ContextMenu from "./components/Popover.svelte";
  import Button from "./components/Button.svelte";
    import Divider from "./components/Divider.svelte";

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
  <Button full text="新标签页打开" onclick={openNewTab} />
  <Button full text="在新窗口中打开" onclick={openNewWindow} />
  <Button full text="在隐身窗口中打开" onclick={openIncognitoWindow} />
  <Button full text="复制链接" onclick={copyLink} />
  {#if children}
    <Divider/>
    {@render children()}
  {/if}
</ContextMenu>

