<script lang="ts">
  import {
    DEFAULT_BACKGROUND_PARAMETERS,
    type BackgroundConfig,
  } from "./background";

  interface Props {
    config: BackgroundConfig;
  }

  let { config }: Props = $props();
  let parameters = $derived(
    config.parameters[config.url] ?? DEFAULT_BACKGROUND_PARAMETERS,
  );
  let transparentPosition = $derived(
    parameters.fadePosition > 100 ? (parameters.fadePosition - 100) / 2 : 0,
  );
  let opaquePosition = $derived(Math.min(parameters.fadePosition, 100));
  let mask = $derived(
    `linear-gradient(to bottom, transparent ${transparentPosition}%, black ${opaquePosition}%)`,
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
      style:object-position={`${parameters.positionX}% ${parameters.positionY}%`}
      style:transform-origin={`${parameters.positionX}% ${parameters.positionY}%`}
      style:transform={`scale(${parameters.scale / 100})`}
      style:filter={`blur(${parameters.blur}px)`}
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
