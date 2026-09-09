<script lang="ts">
  import type { WebSite, WebSiteFolder } from "@/lib/DB/DB";
  import WebsiteTile from "./WebsiteTile.svelte";
  import T from "./components/T.svelte";
  import G from "./components/G.svelte";

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
    <G full>
      <T>{folder.title}</T>
    </G>
    <G>
      <T color='var(--c-text-1)'>{sites.length}</T>
    </G>
  </div>
</div>

<style>
  .folder_tile {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 10;
    overflow: hidden;
    border-radius: var(--r1);
    background: var(--c-bg1);
  }
  .preview_fan {
    position: absolute;
    inset: 0 0 15%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .preview_card {
    position: absolute;
    width: 50%;
    transform-origin: 50% 100%;
    filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.2));
  }
  .card_0 { z-index: 3; }
  .card_1 { z-index: 2; }
  .card_2 { z-index: 1; }
  .count_3 .card_0 {
    transform: translateX(-30%) rotate(-10deg);
  }
  .count_3 .card_1 {
    transform: translateY(-10%) rotate(0);
  }
  .count_3 .card_2 {
    transform: translateX(30%) rotate(10deg);
  }
  .count_2 .card_0 {
    transform: translateX(-18%) rotate(-7deg);
  }
  .count_2 .card_1 {
    transform: translateX(18%) rotate(7deg);
  }
  .count_1 .card_0 {
    transform: translateY(-3%);
  }
  .empty_preview {
    width: 54%;
    aspect-ratio: 4 / 3;
    border: 2px dashed var(--c-text-2);
    border-radius: 8px;
    box-sizing: border-box;
  }
  .folder_glass {
    position: absolute;
    bottom: 0;
    width: 100%;
    height: 60px;
    display: flex;
    padding: var(--gap);
    box-sizing: border-box;
    background: var(--c-mask);
    backdrop-filter: blur(10px);
    align-items: end;
    border-radius: var(--r1);
    z-index: 4;
  }
</style>
