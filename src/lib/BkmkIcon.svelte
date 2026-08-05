<script module lang="ts">
  import { getFavicon } from "../lib/DB/DB";

  const faviconBlobCache = new Map<string, Promise<Blob | undefined>>();

  function getCachedFaviconBlob(domain: string): Promise<Blob | undefined> {
    const cached = faviconBlobCache.get(domain);
    if (cached) return cached;
    const pending = getFavicon(domain)
      .then((record) => {
        const blob = record?.blob;
        if (!blob) {
          faviconBlobCache.delete(domain);
        }
        return blob;
      })
      .catch(() => {
        faviconBlobCache.delete(domain);
        return undefined;
      });
    faviconBlobCache.set(domain, pending);
    return pending;
  }
</script>

<script lang="ts">
  import { browser } from "wxt/browser";
  import { getDomainFromUrl } from "../lib/DB/DB";
  import { getBuiltInWebsiteLogo } from "./DB/websiteLogos";
  import Folder from "./components/svg/Folder.svelte";

  type Size = "xl" | "l" | "m" | "s";

  interface Props {
    imgUrl?: string;
    alt: string;
    size?: Size;
    folderIcon?: boolean;
  }
  let { imgUrl, size = "l", alt, folderIcon }: Props = $props();

  let localSrc = $state<string | null>(null);
  let localResolved = $state(false);

  let builtInSrc = $derived.by(() => {
    if (!imgUrl) return undefined;
    try {
      return getBuiltInWebsiteLogo(getDomainFromUrl(imgUrl));
    } catch {
      return undefined;
    }
  });

  function getBrowserFavicon(url: string, size: number = 128): string {
    if (import.meta.env.FIREFOX) {
      try {
        return new URL("/favicon.ico", url).href;
      } catch {
        return "";
      }
    }
    const getURL = browser.runtime.getURL as (path: string) => string;
    return getURL(
      `/_favicon/?pageUrl=${encodeURIComponent(url)}&size=${size}`,
    );
  }

  $effect(() => {
    if (folderIcon || !imgUrl) {
      localSrc = null;
      localResolved = false;
      return;
    }
    if (builtInSrc) {
      localSrc = builtInSrc;
      localResolved = true;
      return;
    }
    let domain: string | undefined;
    try {
      domain = getDomainFromUrl(imgUrl);
    } catch {
      domain = undefined;
    }
    if (!domain) {
      localSrc = null;
      localResolved = true;
      return;
    }
    localSrc = null;
    localResolved = false;
    let cancelled = false;
    let objectUrl: string | null = null;
    void (async () => {
      const blob = await getCachedFaviconBlob(domain);
      if (cancelled) return;
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        localSrc = objectUrl;
      } else {
        localSrc = null;
      }
      localResolved = true;
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  });
</script>

<div class={size}>
  {#if folderIcon}
    <Folder color="var(--c-text-1)" />
  {:else if imgUrl}
    {#if localResolved}
      {#if localSrc}
        <img src={localSrc} {alt} draggable="false" />
      {:else}
        <img src={getBrowserFavicon(imgUrl)} {alt} draggable="false" />
      {/if}
    {/if}
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
  .m {
    width: 26px;
    min-width: 26px;
    height: 26px;
    min-height: 26px;
    border-radius: calc(var(--r) * 0.5);
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
