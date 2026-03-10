<script lang="ts">
  import T from "./components/T.svelte";

  type Size = "xl" | "l" | "s";

  interface Props {
    imgUrl?: string;
    alt: string;
    size?: Size;
  }
  let { imgUrl, size = "l", alt }: Props = $props();
</script>

{#if imgUrl}
  <img class="engine_icon" src={imgUrl} alt={alt ?? ""} />
{:else}
  <div class="engine_icon engine_icon_fallback">
    <T type="s" align='c'>{alt?.slice(0, 1) ?? "?"}</T>
  </div>
{/if}

<style>
  div {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: row;
    overflow: hidden;
  }
  img {
    display: flex;
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
  }

  .engine_icon {
    width: 26px;
    height: 26px;
    border-radius: var(--r);
    padding: 2px;
    pointer-events: none;
  }
  .engine_icon_fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--c-mask);
    overflow: hidden;
  }
</style>
