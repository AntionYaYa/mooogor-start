<script lang="ts">
  import { getFavicon, getDomainFromUrl } from "../lib/DB/DB";
  import Folder from "./components/svg/Folder.svelte";

  type Size = "xl" | "l" | "s";

  interface Props {
    imgUrl?: string;
    alt: string;
    size?: Size;
    folderIcon?: boolean;
  }
  let { imgUrl, size = "l", alt, folderIcon }: Props = $props();

  function getChromeFavicon(url: string, size: number = 128): string {
    return `chrome-extension://${browser.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=${size}`;
  }

  async function getLoaclFavicon(): Promise<Blob | undefined> {
    const domain = getDomainFromUrl(imgUrl!);
    const favicon = await getFavicon(domain);
    return favicon ? favicon.blob : undefined;
  }
</script>

<div class={size}>
  {#if folderIcon}
    <Folder color="var(--c-text-1)" />
  {:else if imgUrl}
    {#await getLoaclFavicon() then localFavicon}
      {#if localFavicon}
        <img src={URL.createObjectURL(localFavicon)} {alt} draggable="false" />
      {:else}
        <img src={getChromeFavicon(imgUrl)} {alt} draggable="false" />
      {/if}
    {/await}
  {/if}
</div>

<style>
  .xl {
    width: 50px;
    min-width: 50px;
    height: 50px;
    min-height: 50px;
    border-radius: var(--r);
  }
  .l {
    width: 40px;
    min-width: 40px;
    height: 40px;
    min-height: 40px;
    border-radius: var(--r);
  }
  .s {
    width: 20px;
    min-width: 20px;
    height: 20px;
    min-height: 20px;
    border-radius: 2px;
  }
  .xl img {
    border-radius: var(--r);
  }
  .l img {
    border-radius: var(--r);
  }
  .s img {
    border-radius: 2px;
  }

  div {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: row;
    overflow: hidden;
  }
  img {
    display: flex;
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
  }
</style>
