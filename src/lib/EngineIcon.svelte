<script lang="ts">
  import T from "./components/T.svelte";
  import { browser } from "wxt/browser";
  import { getDomainFromUrl } from "../lib/DB/utils";


  interface Props {
    alt: string;
    disabled?: boolean;
    engineUrl?: string;
    src?: string;
    size?: number;
  }
  let { alt, disabled, engineUrl, src, size = 26 }: Props = $props();
  let localSrc = $state<string | null>(null);

  function resolveEngineDomain(url?: string) {
    if (!url) return undefined;
    try {
      return getDomainFromUrl(url.replace("%s", "search"));
    } catch {
      return undefined;
    }
  }

  $effect(() => {
    if (src) {
      localSrc = src;
      return;
    }

    const domain = resolveEngineDomain(engineUrl);
    if (!domain) {
      localSrc = null;
      return;
    }
    localSrc = null;
    let cancelled = false;
    void (async () => {
      const response = await browser.runtime.sendMessage({
        type: "getFaviconData",
        payload: { domain },
      }) as { dataUrl?: string } | null;
      if (cancelled) return;
      if (!response?.dataUrl) {
        localSrc = null;
        return;
      }
      localSrc = response.dataUrl;
    })();
    return () => {
      cancelled = true;
    };
  });
</script>

<div class="engine_icon" style:width={`${size}px`} style:min-width={`${size}px`} style:height={`${size}px`} style:min-height={`${size}px`}>
  {#if localSrc}
    <img src={localSrc} {alt} draggable="false" />
  {:else}
    <span >
      <T type="s" align="c">{alt?.slice(0, 1) ?? "?"}</T>
    </span>
  {/if}
</div>

<style>
  img {
    display: flex;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    object-fit: cover;
    pointer-events: none;
    border-radius: calc(var(--r) / 2);
    background-color: var(--c-card);
  }
  span{
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    border-radius: calc(var(--r) / 2);
    background-color: var(--c-card);
  }

  .engine_icon {
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    width: 26px;
    min-width: 26px;
    height: 26px;
    min-height: 26px;
    padding: 2px;
    pointer-events: none;
  }
</style>
