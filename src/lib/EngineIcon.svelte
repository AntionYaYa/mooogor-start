<script lang="ts">
  import T from "./components/T.svelte";
  import { getFavicon, getDomainFromUrl } from "../lib/DB/DB";
    import G from "./components/G.svelte";


  interface Props {
    alt: string;
    disabled?: boolean;
    engineUrl?: string;
  }
  let { alt, disabled, engineUrl }: Props = $props();

  async function getLoaclFavicon(): Promise<Blob | undefined> {
    if (!engineUrl) return undefined
    const domain = getDomainFromUrl(engineUrl);
    const favicon = await getFavicon(domain);
    return favicon ? favicon.blob : undefined;
  }
</script>

<div class="engine_icon">
  {#if engineUrl}
    {#await getLoaclFavicon() then localFavicon}
      {#if localFavicon}
        <img src={URL.createObjectURL(localFavicon)} {alt} draggable="false" />
      {/if}
    {/await}
  {:else}
    <G align='c'>
      <T type="s" align="c">{alt?.slice(0, 1) ?? "?"}</T>
    </G>
  {/if}
</div>

<style>
  img {
    display: flex;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    object-fit: cover;
    pointer-events: none;
    border-radius: calc(var(--r) / 2);
    background-color: var(--c-mask);
  }

  .engine_icon {
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    width: 26px;
    min-width: 26px;
    height: 26px;
    min-height: 26px;
    padding: 2px;
    pointer-events: none;
  }
</style>
