<script lang="ts">
  import type { BackgroundItem } from "./background";

  interface Props {
    background: BackgroundItem;
  }

  let { background }: Props = $props();
  let transparentPosition = $derived(background.fadePosition / 2);
  let opaquePosition = $derived(100 + background.fadePosition);
  let mask = $derived(
    `linear-gradient(to bottom, transparent ${transparentPosition}%, black ${opaquePosition}%)`,
  );
</script>

<div
  class="background_layer"
  style:--background-color-light={background.lightColor ?? "var(--c-bg)"}
  style:--background-color-dark={background.darkColor ?? "var(--c-bg)"}
  aria-hidden="true"
>
  <div
    class="background_mask"
    style:mask-image={mask}
    style:-webkit-mask-image={mask}
  >
    <img
      src={background.url}
      alt=""
      draggable="false"
      referrerpolicy="no-referrer"
      style:object-position={`${background.positionX}% ${background.positionY}%`}
      style:transform-origin={`${background.positionX}% ${background.positionY}%`}
      style:transform={`scale(${background.scale / 100})`}
      style:filter={`blur(${background.blur}px)`}
    />
  </div>
</div>

<style>
  .background_layer,
  .background_mask {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .background_layer {
    z-index: -1;
    background-color: var(--background-color-light);
  }

  @media (prefers-color-scheme: dark) {
    .background_layer {
      background-color: var(--background-color-dark);
    }
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    user-select: none;
  }
</style>
