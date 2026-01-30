<script lang="ts">
    import BkmkIcon from "./BkmkIcon.svelte";
  import T from "./components/T.svelte";
  import type { BookmarkNode } from "../entrypoints/newtab/methods/getBookmarks";

  interface Props {
    allBookmarksBar: BookmarkNode[] | [];
  }

  let { allBookmarksBar }: Props = $props();

  $inspect(allBookmarksBar);
</script>

<div class="bkmks">
  {#each allBookmarksBar as bkmk}
    {#if bkmk.url}
      <a href={bkmk.url}>
        <BkmkIcon imgUrl={bkmk.url} alt={bkmk.title}/>
        <T nowrap align="c" type='s'>{bkmk.title}</T>
      </a>
    {:else}
      <T>{bkmk.title}</T>
    {/if}
  {/each}
</div>

<style>
  .bkmks {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: var(--gap);
    padding: var(--gap);
  }
  a {
    display: flex;
    flex-direction: column;
    align-items: center;
    /* background-color: var(--c-bg1); */
    text-decoration: none;
    color: inherit;
    padding: var(--gap);
    gap: var(--gap);
    cursor: default;
    border-radius: var(--r);
  }
  a:active{
    background-color: var(--c-mask);
		transform: translateY(2px);
		transition: all 0.1s ease-out;
  }
</style>
