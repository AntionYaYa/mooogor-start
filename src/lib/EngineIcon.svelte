<script lang="ts">
  import { getBuiltInEngineIcon, withoutGoogleFavicon } from "./DB/engineFavicons";
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

  let advanceIcon = $state<() => void>(() => {});

  $effect(() => {
    const initialSrc = withoutGoogleFavicon(src) || getBuiltInEngineIcon(engineUrl);
    const url = engineUrl?.replace("%s", "search");
    let domain: string | undefined;
    try {
      domain = url ? getDomainFromUrl(url) : undefined;
    } catch {
      domain = undefined;
    }
    let cancelled = false;
    let stage = 0;
    localSrc = initialSrc || null;

    const next = async () => {
      if (cancelled) return;
      if (stage === 0) {
        stage = 1;
        if (domain) {
          try {
            const response = await browser.runtime.sendMessage({
              type: "getFaviconData",
              payload: { domain },
            }) as { dataUrl?: string } | null;
            if (cancelled) return;
            if (response?.dataUrl) {
              localSrc = response.dataUrl;
              return;
            }
          } catch {
            // A missing/unavailable cache must not prevent browser fallback.
          }
        }
      }
      if (cancelled) return;
      if (stage === 1) {
        stage = 2;
        // Firefox does not provide Chromium's local favicon endpoint.
        if (domain && url && !import.meta.env.FIREFOX) {
          const getURL = browser.runtime.getURL as (path: string) => string;
          localSrc = getURL(`/_favicon/?pageUrl=${encodeURIComponent(url)}&size=128`);
          return;
        }
      }
      localSrc = null;
    };
    advanceIcon = () => { void next(); };
    if (!initialSrc) void next();
    return () => { cancelled = true; };
  });
</script>

<div class="engine_icon" style:width={`${size}px`} style:min-width={`${size}px`} style:height={`${size}px`} style:min-height={`${size}px`}>
  {#if localSrc}
    {#key localSrc}
      <img src={localSrc} {alt} draggable="false" onerror={advanceIcon} />
    {/key}
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
