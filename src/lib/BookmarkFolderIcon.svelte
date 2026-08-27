<script lang="ts">
  import type { BookmarkNode } from "@/lib/browser/bookmarks";
  import { getBookmarkChildren } from "@/lib/browser/bookmarks";
  import BkmkIcon from "./BkmkIcon.svelte";
  import Folder from "./components/svg/Folder.svelte";

  type Size = "xl" | "l" | "m" | "s";

  interface Props {
    folder: BookmarkNode;
    size?: Size;
  }

  let { folder, size = "l" }: Props = $props();
  let previewUrls = $state<string[]>([]);

  $effect(() => {
    const folderId = folder.id;
    const includedChildren = folder.children;
    let cancelled = false;

    void (async () => {
      const children = includedChildren ?? await getBookmarkChildren(folderId);
      if (cancelled) return;
      previewUrls = children
        .flatMap((child) => child.url ? [child.url] : [])
        .slice(0, 4);
    })().catch(() => {
      if (!cancelled) previewUrls = [];
    });

    return () => {
      cancelled = true;
    };
  });
</script>

<div class="folder_preview {size}" aria-hidden="true">
  {#if previewUrls.length}
    <div class="preview_grid">
      {#each previewUrls as url, index (`${url}-${index}`)}
        <div class="preview_item">
          <BkmkIcon imgUrl={url} alt="" size="s" />
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
    background: var(--c-mask);
  }
  .xl {
    width: 50px;
    height: 50px;
    border-radius: var(--r);
    padding: 6px;
  }
  .l {
    width: 40px;
    height: 40px;
    border-radius: var(--r);
    padding: 5px;
  }
  .m {
    width: 26px;
    height: 26px;
    border-radius: calc(var(--r) * 0.5);
    padding: 3px;
  }
  .s {
    width: 20px;
    height: 20px;
    border-radius: 2px;
    padding: 2px;
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
  .preview_item :global(.s) {
    width: 100%;
    min-width: 0;
    height: 100%;
    min-height: 0;
    border-radius: inherit;
  }
</style>
