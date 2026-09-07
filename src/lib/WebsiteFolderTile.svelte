<script lang="ts">
  import type { WebSite, WebSiteFolder } from "@/lib/DB/DB";
  import WebsiteTile from "./WebsiteTile.svelte";

  interface Props {
    folder: WebSiteFolder;
    sites: WebSite[];
  }

  let { folder, sites }: Props = $props();
  let previews = $derived(sites.slice(0, 3));
</script>

<div class="folder_tile" aria-hidden="true">
  <div class="preview_fan count_{previews.length}">
    {#if previews.length}
      {#each previews as site, index (site.id ?? site.url)}
        <div class="preview_card card_{index}">
          <WebsiteTile {site} preview />
        </div>
      {/each}
    {:else}
      <div class="empty_preview"></div>
    {/if}
  </div>
  <div class="folder_glass">
    <span title={folder.title}>{folder.title}</span>
    <small>{sites.length}</small>
  </div>
</div>

<style>
  .folder_tile {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 10;
    overflow: hidden;
    border-radius: var(--r1);
    corner-shape: squircle;
    background: var(--c-card);
    box-shadow: inset 0 0 0 1px var(--c-border);
  }
  .preview_fan {
    position: absolute;
    inset: 12px 12px 28%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .preview_card {
    position: absolute;
    width: 54%;
    transform-origin: 50% 110%;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.18));
  }
  .count_3 .card_0 { transform: translateX(-28%) rotate(-10deg); }
  .count_3 .card_1 { transform: translateY(-5%) rotate(0); }
  .count_3 .card_2 { transform: translateX(28%) rotate(10deg); }
  .count_2 .card_0 { transform: translateX(-18%) rotate(-7deg); }
  .count_2 .card_1 { transform: translateX(18%) rotate(7deg); }
  .count_1 .card_0 { transform: translateY(-3%); }
  .empty_preview {
    width: 54%;
    aspect-ratio: 4 / 3;
    border: 2px dashed var(--c-text-2);
    border-radius: 8px;
    box-sizing: border-box;
  }
  .folder_glass {
    position: absolute;
    inset: 61% 0 0;
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 10px;
    box-sizing: border-box;
    color: var(--c-text);
    background: color-mix(in srgb, var(--c-bg1) 62%, transparent);
    border-top: 1px solid color-mix(in srgb, var(--c-text) 14%, transparent);
    backdrop-filter: blur(14px) saturate(1.25);
  }
  span {
    min-width: 0;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--f-size-s);
    font-weight: var(--f-bold);
  }
  small {
    color: var(--c-text-1);
    font-size: 10px;
  }
</style>
