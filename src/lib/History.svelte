<script lang="ts">
  import type { HistoryItem } from "../entrypoints/newtab/methods/getHistorys";

  interface Props {
    AllHistory: HistoryItem[] | [];
  }

  let { AllHistory }: Props = $props();

</script>

<div >
  {#each AllHistory as History}
  <p>{History.title}</p>
  {/each}
</div>

<style>

</style>
