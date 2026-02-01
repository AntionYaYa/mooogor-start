<script lang="ts">
    import BkmkIcon from "./BkmkIcon.svelte";
  import T from "./components/T.svelte";
  import type { BookmarkNode } from "../entrypoints/newtab/methods/getBookmarks";

  interface Props {
    // allBookmarksBar: BookmarkNode[] | [];
  }

  let {  }: Props = $props();

</script>

<div >
  <p>history</p>
</div>

<style>

</style>
