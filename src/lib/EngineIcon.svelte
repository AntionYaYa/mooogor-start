<script lang="ts">
  import { getDomainFromUrl, getFavicon } from "@/lib/DB/DB";
  import T from "./components/T.svelte";

  type Size = "xl" | "l" | "s";

  interface Props {
    imgUrl?: string;
    alt: string;
    size?: Size;
    disabled?: boolean;
    engineUrl?: string;
  }
  let { imgUrl, size = "l", alt, disabled, engineUrl }: Props = $props();

  function resolveEngineDomain(url?: string) {
    if (!url) return undefined;
    try {
      return getDomainFromUrl(url.replace("%s", "search"));
    } catch {
      return undefined;
    }
  }

  async function getLocalFavicon(): Promise<Blob | undefined> {
    const domain = resolveEngineDomain(engineUrl);
    if (!domain) return undefined;
    const favicon = await getFavicon(domain);
    return favicon?.blob;
  }
</script>

{#if imgUrl || engineUrl}
  {#await getLocalFavicon() then localFavicon}
    {#if localFavicon}
      <img
        class="engine_icon"
        class:disabled={disabled}
        src={URL.createObjectURL(localFavicon)}
        alt={alt ?? ""}
      />
    {:else if imgUrl}
      <img
        class="engine_icon"
        class:disabled={disabled}
        src={imgUrl}
        alt={alt ?? ""}
      />
    {:else}
      <div class="engine_icon engine_icon_fallback" class:disabled={disabled}>
        <T type="s" align="c">{alt?.slice(0, 1) ?? "?"}</T>
      </div>
    {/if}
  {/await}
{:else}
  <div class="engine_icon engine_icon_fallback" class:disabled={disabled}>
    <T type="s" align="c">{alt?.slice(0, 1) ?? "?"}</T>
  </div>
{/if}

<style>
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

  .engine_icon {
    width: 26px;
    height: 26px;
    border-radius: var(--r);
    padding: 2px;
    pointer-events: none;
  }
  .engine_icon_fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--c-mask);
    overflow: hidden;
  }
  .disabled{
    opacity: 0.6;
  }
</style>
