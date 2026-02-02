<script lang="ts">
  import T from "./components/T.svelte";

  type Size = "l" | "s";

  interface Props {
    imgUrl?: string;
    alt?: string;
    size?: Size;
  }
  let { imgUrl, size = "l", alt = "" }: Props = $props();

  let stage = $state<0 | 1 | 2>(0);

  const fallbackChar = $derived(alt?.trim()?.[0]?.toUpperCase() || "?");

  const googleIconUrl = $derived(
    imgUrl ? `https://www.google.com/s2/favicons?sz=40&domain_url=${imgUrl}` : ""
  );

  function handleError() {
    if (stage < 2) stage++;
  }
</script>

<div class={size}>
  {#if stage === 0 && imgUrl}
    <img
      src={imgUrl}
      {alt}
      draggable="false"
      onerror={handleError}
    />
  {:else if stage === 1 && googleIconUrl}
    <img
      src={googleIconUrl}
      {alt}
      draggable="false"
      onerror={handleError}
    />
  {:else}
    <T type="l" align="c">{fallbackChar}</T>
  {/if}
</div>

<style>
  .l {
    width: 40px;
    min-width: 40px;
    height: 40px;
    min-height: 40px;
    border-radius: var(--r1);
  }
  .s {
    width: 20px;
    min-width: 20px;
    height: 20px;
    min-height: 20px;
    border-radius: var(--r1);
  }
  .l img {
    border-radius: var(--r);
  }
  .s img {
    border-radius: 2px;
  }
  div {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: row;
    background-color: var(--c-bg1);
    overflow: hidden;
    padding: var(--gap);
  }
  img {
    display: flex;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
