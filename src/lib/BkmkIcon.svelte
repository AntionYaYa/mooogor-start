<script lang="ts">
  import folder from "../assets/folder.svg";

  import { addFavicon, getFavicon, updateFavicon } from "../lib/DB/DB";
  import type { Favicon } from "../lib/DB/DB";

  type Size = "l" | "s";
  interface Props {
    imgUrl?: string;
    alt: string;
    size?: Size;
  }
  let { imgUrl, size = "l", alt }: Props = $props();

 
  function getChromeFavicon(url: string, size: number = 128): string {
    return `chrome-extension://${browser.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=${size}`;
  }

  async function getLoaclFavicon(): Promise<Blob | undefined> {
    const domain = imgUrl ? new URL(imgUrl).origin : "";
    const favicon = await getFavicon(domain);
    return favicon?favicon.blob:undefined
  }
</script>

<div class={size}>
  {#if imgUrl}
    {#await getLoaclFavicon() then localFavicon}
      {#if localFavicon}
        <img src={URL.createObjectURL(localFavicon)} alt={alt} draggable="false" />
      {:else}
        <img src={getChromeFavicon(imgUrl)} alt={alt} draggable="false" />
      {/if}
    {/await}
  {:else}
    <img src={folder} alt={alt} draggable="false" />
  {/if}
</div>

<style>
  .l {
    width: 40px;
    min-width: 40px;
    height: 40px;
    min-height: 40px;
    border-radius: var(--r1);
  }
  .s {
    width: 20px;
    min-width: 20px;
    height: 20px;
    min-height: 20px;
    border-radius: var(--r1);
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
    padding: var(--gap);
  }
  img {
    display: flex;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
