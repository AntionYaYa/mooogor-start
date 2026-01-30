<script lang="ts">
  import { getFavicon } from "../lib/DB/DB";
  import type { Favicon } from "../lib/DB/DB";

  type Size = "l" | "s";
  interface Props {
    imgUrl: string;
    alt: string;
    size?: Size;
  }
  let { imgUrl, size = "l", alt }: Props = $props();

  onMount(async () => {
    const loaclFavicon: Favicon = await getFavicon(new URL(imgUrl).hostname);
    if (loaclFavicon && loaclFavicon.faviconUrl) {
      imgUrl = loaclFavicon.faviconUrl;
      return;
    }
    if (loaclFavicon) {
      imgUrl = `https://icons.duckduckgo.com/ip3/${loaclFavicon.domain}.ico`;
      return;
    }
    imgUrl = `https://www.google.com/s2/favicons?sz=40&domain_url=${imgUrl}`;
  });
</script>

<div class={size}>
  <img src={imgUrl} {alt} draggable="false" />
</div>

<style>
  .l {
    width: 40px;
    height: 40px;
  }
  .s {
    width: 20px;
    height: 20px;
  }
  div {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: row;
    border-radius: var(--r);
    /* background-color: var(--c-bg); */
    overflow: hidden;
  }
  img {
    display: flex;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
