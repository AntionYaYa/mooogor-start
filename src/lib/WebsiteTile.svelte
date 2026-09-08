<script lang="ts">
  import type { WebSite } from "@/lib/DB/DB";
  import BkmkIcon from "./BkmkIcon.svelte";
  import { getWebSiteScreenshot } from "@/lib/DB/DB";

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
  function foregroundFor(background?: string) {
    const match = background?.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
    if (!match) return "var(--c-text)";
    const [red, green, blue] = match.slice(1).map((channel) =>
      Number.parseInt(channel, 16) / 255,
    );
    const linear = [red, green, blue].map((channel) =>
      channel <= 0.03928
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    );
    const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    return luminance > 0.42 ? "#17181c" : "#ffffff";
  }
  let tileStyle = $derived(
    hasColor
      ? `--tile-color:${site.backgroundColor};--tile-color-alt:${site.backgroundColorAlt || `color-mix(in srgb, ${site.backgroundColor} 82%, white)`};--tile-foreground:${foregroundFor(site.backgroundColor)}`
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
    void getWebSiteScreenshot(websiteId, websiteUrl).then((screenshot) => {
      if (cancelled || !screenshot) return;
      objectUrl = URL.createObjectURL(screenshot.blob);
      screenshotUrl = objectUrl;
    }).catch(() => undefined);
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
    <div class="screenshot_scrim"></div>
    <div class="bottom_identity">
      <BkmkIcon imgUrl={site.url} alt="" size={preview ? "s" : "m"} />
      {#if !preview}<span title={title}>{title}</span>{/if}
    </div>
  {:else}
    <div class="center_identity">
      <BkmkIcon imgUrl={site.url} alt="" size={preview ? "m" : "xl"} />
      {#if !preview}<span title={title}>{title}</span>{/if}
    </div>
  {/if}
  {#if loading}
    <div class="capture_loading" aria-hidden="true">
      <span></span>
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
    z-index: 5;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, 0.34);
    backdrop-filter: blur(3px);
  }
  .capture_loading span {
    width: 24px;
    height: 24px;
    box-sizing: border-box;
    border: 3px solid rgba(255, 255, 255, 0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: capture-spin 0.75s linear infinite;
  }
  @keyframes capture-spin {
    to { transform: rotate(360deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    .capture_loading span { animation-duration: 1.5s; }
  }
  .website_tile.has_color {
    background: linear-gradient(
      135deg,
      var(--tile-color),
      var(--tile-color-alt)
    );
    color: var(--tile-foreground);
  }
  .screenshot {
    position: absolute;
    inset: 0;
    z-index: -2;
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
  }
  .screenshot_scrim {
    position: absolute;
    inset: 32% 0 0;
    z-index: -1;
    background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.78));
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
    color: white;
  }
  .center_identity {
    inset: 0;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 9px;
    padding: 14px;
  }
  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--f-size-s);
    font-weight: var(--f-bold);
    line-height: 1.35;
  }
  .bottom_identity span {
    flex: 1;
    text-shadow: 0 1px 5px rgba(0, 0, 0, 0.8);
  }
  .center_identity span {
    width: 100%;
    text-align: center;
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
