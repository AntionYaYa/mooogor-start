<script lang="ts">
  import T from "./components/T.svelte";
  import { getDomainFromUrl, getFavicon } from "../lib/DB/DB";


  interface Props {
    alt: string;
    disabled?: boolean;
    engineUrl?: string;
    src?: string;
  }
  let { alt, disabled, engineUrl, src }: Props = $props();
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
    let objectUrl: string | null = null;
    void (async () => {
      const record = await getFavicon(domain);
      if (cancelled) return;
      if (!record?.blob) {
        localSrc = null;
        return;
      }
      objectUrl = URL.createObjectURL(record.blob);
      localSrc = objectUrl;
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
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
