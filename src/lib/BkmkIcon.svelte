<script lang="ts">
  import folder from "../assets/folder.svg";

  import {  getFavicon, getDomainFromUrl } from "../lib/DB/DB";


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
    <img src={folder} {alt} draggable="false" />
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
    width: 54px;
    min-width: 54px;
    height: 54px;
    min-height: 54px;
    border-radius: var(--r1);
  }
  .l {
    width: 40px;
    min-width: 40px;
    height: 40px;
    min-height: 40px;
    border-radius: var(--r1);
    padding: var(--gap);
  }
  .s {
    width: 20px;
    min-width: 20px;
    height: 20px;
    min-height: 20px;
    border-radius: var(--r1);
    padding: var(--gap);
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
    background-color: var(--c-bg1);
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
