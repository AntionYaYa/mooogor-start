<script lang="ts">
  import T from "./components/T.svelte";
  import { getDomainFromUrl } from "../lib/DB/DB";
  import G from "./components/G.svelte";
  import {
    ensureEngineFaviconCached,
    getCachedEngineFavicon,
  } from "../lib/utils/engineFaviconCache";


  interface Props {
    alt: string;
    disabled?: boolean;
    engineUrl?: string;
  }
  let { alt, disabled, engineUrl }: Props = $props();
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
    const domain = resolveEngineDomain(engineUrl);
    if (!domain) {
      localSrc = null;
      return;
    }
    const cached = getCachedEngineFavicon(domain);
    if (cached !== undefined) {
      localSrc = cached;
      return;
    }
    localSrc = null;
    let cancelled = false;
    void ensureEngineFaviconCached(domain).then((url) => {
      if (!cancelled) localSrc = url;
    });
    return () => {
      cancelled = true;
    };
  });
</script>

<div class="engine_icon">
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
    background-color: var(--c-mask);
  }
  span{
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    border-radius: calc(var(--r) / 2);
    background-color: var(--c-mask);
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
