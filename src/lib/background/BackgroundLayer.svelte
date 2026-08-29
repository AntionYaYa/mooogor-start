<script lang="ts">
  import type { BackgroundConfig } from "./background";

  interface Props {
    config: BackgroundConfig;
  }

  let { config }: Props = $props();
  let mask = $derived(
    `linear-gradient(to bottom, transparent 0%, black ${config.fadePosition}%)`,
  );
  let colorScheme = $derived(config.colorSchemes[config.url]);
</script>

<div
  class="background_layer"
  style:--background-color-light={colorScheme?.lightColor ?? "var(--c-bg)"}
  style:--background-color-dark={colorScheme?.darkColor ?? "var(--c-bg)"}
  aria-hidden="true"
>
  <div
    class="background_mask"
    style:mask-image={mask}
    style:-webkit-mask-image={mask}
  >
    <img
      src={config.url}
      alt=""
      draggable="false"
      referrerpolicy="no-referrer"
      style:object-position={`${config.positionX}% ${config.positionY}%`}
      style:transform-origin={`${config.positionX}% ${config.positionY}%`}
      style:transform={`scale(${config.scale / 100})`}
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
