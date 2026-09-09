<script lang="ts">
  import type { WebSite } from "@/lib/DB/DB";
  import BkmkIcon from "./BkmkIcon.svelte";
  import { getWebSiteScreenshot } from "@/lib/DB/DB";
  import { createWebsiteCardThemeColors } from "@/lib/background/backgroundColors";
  import T from "./components/T.svelte";
    import Icon from "./components/Icon.svelte";

  interface Props {
    site: WebSite;
    preview?: boolean;
    loading?: boolean;
  }

  let { site, preview = false, loading = false }: Props = $props();
  let screenshotFailed = $state(false);
  let screenshotUrl = $state<string | null>(null);
  let hasScreenshot = $derived(!!screenshotUrl && !screenshotFailed);
  let hasColor = $derived(!!site.backgroundColor);
  let title = $derived(site.title?.trim() || site.domain);
  let tileStyle = $derived(
    site.backgroundColor
      ? (() => {
          const colors = createWebsiteCardThemeColors(site.backgroundColor);
          return `--tile-light:${colors.light};--tile-light-alt:${colors.lightAlt};--tile-dark:${colors.dark};--tile-dark-alt:${colors.darkAlt}`;
        })()
      : undefined,
  );

  $effect(() => {
    const websiteId = site.id;
    const websiteUrl = site.url;
    // updateAt changes after a new screenshot is saved and refreshes this URL.
    void site.updateAt;
    screenshotFailed = false;
    screenshotUrl = null;
    if (websiteId == null) return;
    let cancelled = false;
    let objectUrl: string | undefined;
    void getWebSiteScreenshot(websiteId, websiteUrl)
      .then((screenshot) => {
        if (cancelled || !screenshot) return;
        objectUrl = URL.createObjectURL(screenshot.blob);
        screenshotUrl = objectUrl;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  });
</script>

<div
  class="website_tile"
  class:has_screenshot={hasScreenshot}
  class:has_color={hasColor}
  class:preview
  aria-busy={loading}
  style={tileStyle}
>
  {#if hasScreenshot}
    <img
      class="screenshot"
      src={screenshotUrl ?? ""}
      alt=""
      draggable="false"
      onerror={() => (screenshotFailed = true)}
    />
    <div class="bottom_identity">
      <BkmkIcon imgUrl={site.url} alt="" size="s" />
      {#if !preview}
        <T nowrap>{title}</T>
      {/if}
    </div>
  {:else}
    <div class="center_identity">
      <BkmkIcon imgUrl={site.url} alt="" size={preview ? "m" : "l"} />
      {#if !preview}
        <T align="c" nowrap>{title}</T>
      {/if}
    </div>
  {/if}
  {#if loading}
    <div class="capture_loading" aria-hidden="true">
      <Icon name="Loading" color="var(--c-text)" />
    </div>
  {/if}
</div>

<style>
  .website_tile {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 10;
    min-width: 0;
    overflow: hidden;
    border-radius: var(--r1);
    background: var(--c-card);
    color: var(--c-text);
    isolation: isolate;
  }
  .capture_loading {
    position: absolute;
    inset: 0;
    display: flex;
    place-items: center;
    background: var(--c-mask);
    backdrop-filter: blur(5px);
    align-items: center;
    justify-content: center;
    border-radius: var(--r1);
  }
  @keyframes capture-spin {
    to {
      transform: rotate(360deg);
    }
  }
  .website_tile.has_color {
    background: linear-gradient(
      135deg,
      var(--tile-light),
      var(--tile-light-alt)
    );
    color: #17181c;
  }
  @media (prefers-color-scheme: dark) {
    .website_tile.has_color {
      background: linear-gradient(
        135deg,
        var(--tile-dark),
        var(--tile-dark-alt)
      );
      color: #fff;
    }
  }
  .screenshot {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
    mask-image: llinear-gradient(to bottom, #000 50%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, #000 50%, transparent 100%);
  }
  .bottom_identity,
  .center_identity {
    position: absolute;
    display: flex;
    min-width: 0;
    box-sizing: border-box;
  }
  .bottom_identity {
    inset: auto 0 0;
    align-items: center;
    gap: 8px;
    padding: 10px;
    color: #17181c;
  }
  @media (prefers-color-scheme: dark) {
    .bottom_identity {
      color: #fff;
    }
  }
  .center_identity {
    inset: 0;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 9px;
    padding: 14px;
  }
  .preview {
    aspect-ratio: 4 / 3;
    border-radius: 8px;
  }
  .preview .bottom_identity {
    justify-content: center;
    padding: 5px;
  }
</style>
