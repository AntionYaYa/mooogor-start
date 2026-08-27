<script lang="ts">
  import BkmkIcon from "./BkmkIcon.svelte";
  import Folder from "./components/svg/Folder.svelte";

  type Size = "xl" | "l" | "m" | "s";

  interface Props {
    previewUrls?: string[];
    size?: Size;
  }

  let { previewUrls = [], size = "l" }: Props = $props();
</script>

<div class="folder_preview {size}" aria-hidden="true">
  {#if previewUrls.length}
    <div class="preview_grid">
      {#each previewUrls as url, index (`${url}-${index}`)}
        <div class="preview_item">
          <BkmkIcon imgUrl={url} alt="" size="fill" />
        </div>
      {/each}
    </div>
  {:else}
    <Folder color="var(--c-text-1)" />
  {/if}
</div>

<style>
  .folder_preview {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    overflow: hidden;
    box-sizing: border-box;
  }
  .xl {
    width: 50px;
    height: 50px;
    border-radius: var(--r);
  }
  .l {
    width: 40px;
    height: 40px;
    border-radius: var(--r);
  }
  .m {
    width: 26px;
    height: 26px;
    border-radius: calc(var(--r) * 0.5);
  }
  .s {
    width: 20px;
    height: 20px;
    border-radius: 2px;
  }
  .preview_grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: repeat(2, minmax(0, 1fr));
    gap: 2px;
    width: 100%;
    height: 100%;
  }
  .m .preview_grid,
  .s .preview_grid {
    gap: 1px;
  }
  .preview_item {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    border-radius: 2px;
  }
</style>
