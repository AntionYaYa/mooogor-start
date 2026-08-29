<script lang="ts">
  import {
    DEFAULT_BACKGROUND_PARAMETERS,
    cloneBackgroundItem,
    type BackgroundConfig,
    type BackgroundItem,
  } from "@/lib/background/background";
  import Icon from "@/lib/components/Icon.svelte";
  import T from "@/lib/components/T.svelte";
  import { t } from "@/lib/utils/i18n";
  import G from "../components/G.svelte";

  interface Props {
    config: BackgroundConfig;
    onPreview: (config: BackgroundConfig) => void;
    onCommit: (config: BackgroundConfig) => void;
    onOpenAdd: () => void;
    onRemove: (url: string) => void;
  }

  type NumericSetting = keyof typeof DEFAULT_BACKGROUND_PARAMETERS;

  let { config, onPreview, onCommit, onOpenAdd, onRemove }: Props = $props();
  let loadedUrls = $state<Record<string, boolean>>({});

  function disableBackground() {
    onCommit({ ...config, enabled: false });
  }

  function selectBackground(id: string) {
    const item = config.items.find((item) => item.id === id);
    if (!item) return;
    onCommit({
      ...config,
      enabled: true,
      current: cloneBackgroundItem(item),
    });
  }

  function requestRemove(event: MouseEvent, id: string) {
    event.stopPropagation();
    onRemove(id);
  }

  function selectModeColor(
    mode: "light" | "dark",
    color: string,
  ) {
    updateCurrent({
      [mode === "light" ? "lightColor" : "darkColor"]: color,
    });
  }

  function updateCurrent(patch: Partial<BackgroundItem>) {
    const current = { ...config.current, ...patch };
    onCommit({
      ...config,
      current,
      items: config.items.map((item) =>
        item.id === current.id ? cloneBackgroundItem(current) : item,
      ),
    });
  }

  function getRangeValue(event: Event) {
    return Number((event.currentTarget as HTMLInputElement).value);
  }

  function previewNumber(key: NumericSetting, event: Event) {
    updateNumber(key, getRangeValue(event), onPreview);
  }

  function commitNumber(key: NumericSetting, event: Event) {
    updateNumber(key, getRangeValue(event), onCommit);
  }

  function resetNumber(key: NumericSetting) {
    updateNumber(key, DEFAULT_BACKGROUND_PARAMETERS[key], onCommit);
  }

  function updateNumber(
    key: NumericSetting,
    value: number,
    update: (config: BackgroundConfig) => void,
  ) {
    update({
      ...config,
      current: { ...config.current, [key]: value },
      items: config.items.map((item) =>
        item.id === config.current.id ? { ...item, [key]: value } : item,
      ),
    });
  }

  function finishThumbnailLoad(url: string) {
    loadedUrls = { ...loadedUrls, [url]: true };
  }
</script>

<div class="background_settings">
  <div class="background_grid">
    <button
      type="button"
      class="background_choice default_choice"
      class:selected={!config.enabled}
      aria-label={t("nt_settings_background_none")}
      title={t("nt_settings_background_none")}
      onclick={disableBackground}
    ></button>

    {#each config.items as item, index (item.id)}
      {@const url = item.url}
      <div class="background_card">
        <button
          type="button"
          class="background_choice"
          class:selected={config.enabled && config.current.id === item.id}
          title={`${t("nt_settings_background_option")} ${index + 1}`}
          onclick={() => selectBackground(item.id)}
        >
          {#if !loadedUrls[url]}
            <span class="thumbnail_placeholder" aria-hidden="true"></span>
          {/if}
          <img
            class:loaded={loadedUrls[url]}
            src={url}
            alt={`${t("nt_settings_background_option")} ${index + 1}`}
            loading="lazy"
            draggable="false"
            referrerpolicy="no-referrer"
            onload={() => finishThumbnailLoad(url)}
            onerror={() => finishThumbnailLoad(url)}
          />
        </button>
        {#if item.deletable}
          <button
            type="button"
            class="remove_background"
            aria-label={t("nt_settings_background_remove")}
            title={t("nt_settings_background_remove")}
            onclick={(event) => requestRemove(event, item.id)}
          >
            <Icon name="X" color="#fff" size={16} />
          </button>
        {/if}
      </div>
    {/each}

    <button
      type="button"
      class="background_choice utility_choice"
      onclick={onOpenAdd}
    >
      <Icon name="Plus" color="var(--c-text)" opacity={0.6} />
      <T type="s" align="c" nowrap>{t("nt_settings_background_add")}</T>
    </button>
  </div>

  {#if config.enabled && config.current.options.length}
    <div class="color_modes">
      {@render colorMode(
        t("nt_settings_background_light_color"),
        "light",
        config.current,
      )}
      {@render colorMode(
        t("nt_settings_background_dark_color"),
        "dark",
        config.current,
      )}
    </div>
  {/if}

  {#if config.enabled}
    <div class="background_controls">
      {@render rangeControl(
        t("nt_settings_background_fade"),
        "fadePosition",
        config.current.fadePosition,
        0,
        100,
        "%",
      )}
      {@render rangeControl(
        t("nt_settings_background_scale"),
        "scale",
        config.current.scale,
        100,
        200,
        "%",
      )}
      {@render rangeControl(
        t("nt_settings_background_position_x"),
        "positionX",
        config.current.positionX,
        0,
        100,
        "%",
      )}
      {@render rangeControl(
        t("nt_settings_background_position_y"),
        "positionY",
        config.current.positionY,
        0,
        100,
        "%",
      )}
      {@render rangeControl(
        t("nt_settings_background_blur"),
        "blur",
        config.current.blur,
        0,
        100,
        "%",
      )}
    </div>
  {/if}
</div>

{#snippet colorMode(
  label: string,
  mode: "light" | "dark",
  background: BackgroundItem,
)}
  <div class="color_mode">
  <G>
    <T type="s">{label}</T>
  </G>
    <div class="color_options">
      {#each background.options as option (option.base)}
        {@const color = mode === "light" ? option.light : option.dark}
        <button
          type="button"
          class="color_option"
          class:selected_color={color ===
            (mode === "light" ? background.lightColor : background.darkColor)}
          title={color}
          aria-label={`${label} ${color}`}
          onclick={() => selectModeColor(mode, color)}
        >
          <span class="color_swatch" style:background-color={color}></span>
        </button>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet rangeControl(
  label: string,
  key: NumericSetting,
  value: number,
  min: number,
  max: number,
  unit: string,
)}
  <div class="range_control">
    <G>
        <T type="s" nowrap>{label}</T>
        <button
          type="button"
          class="range_reset"
          aria-label={t("nt_settings_background_reset")}
          title={t("nt_settings_background_reset")}
          onclick={() => resetNumber(key)}
        >
          <T type="s" color="var(--c-text-2)" fullWidth={false} nowrap>{value}{unit}</T>
          <Icon name="RotateCcw" color="var(--c-text)" size={14} opacity={0.4}/>
        </button>
    </G>
    <input
      class="range_input"
      type="range"
      aria-label={label}
      {min}
      {max}
      step="1"
      {value}
      style:--range-progress={`${((value - min) / (max - min)) * 100}%`}
      oninput={(event) => previewNumber(key, event)}
      onchange={(event) => commitNumber(key, event)}
    />
  </div>
{/snippet}

<style>
  .background_settings,
  .background_controls,
  .color_modes {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    gap: 0;
    padding: var(--gap);
  }

  .background_grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--gap);
    padding: var(--gap);
  }

  .background_card {
    position: relative;
    min-width: 0;
  }

  .background_choice {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--gap);
    width: 100%;
    aspect-ratio: 16 / 10;
    padding: 0;
    overflow: hidden;
    border: 2px solid var(--c-border);
    border-radius: var(--r1);
    box-sizing: border-box;
    background: unset;
    cursor: pointer;
  }

  .background_choice.selected {
    border-color: var(--c-main);
    background-color: var(--c-main-3);
  }
  .utility_choice {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--gap);
  }
  .default_choice {
    background: radial-gradient(
      circle at bottom,
      var(--c-main-3) 0%,
      var(--c-bg) 50%
    );
    background-clip: padding-box;
  }

  .background_choice img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
  }

  .background_choice img.loaded {
    opacity: 1;
  }

  .thumbnail_placeholder {
    position: absolute;
    inset: 0;
    background: var(--c-mask);
  }

  .remove_background {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--r-100);
  }

  .remove_background {
    top: var(--gap);
    right: var(--gap);
    border: 0;
    background-color: rgba(0, 0, 0, 0.6);
    padding: calc(var(--gap) / 2);
    cursor: pointer;
  }

  .color_mode,
  .range_control {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 0;
    box-sizing: border-box;
  }

  .color_options {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: var(--gap);
    padding: var(--gap);
    box-sizing: border-box;
  }

  .color_option {
    width: 100%;
    aspect-ratio: 1;
    padding: 2px;
    border: 2px solid transparent;
    border-radius: 50%;
    box-sizing: border-box;
    background: transparent;
    cursor: pointer;
  }

  .color_option.selected_color {
    border-color: var(--c-main);
  }

  .color_swatch {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }

  .range_reset {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }

  .range_input {
    appearance: none;
    -webkit-appearance: none;
    width: 100%;
    margin: 0;
    padding: calc(var(--gap) * 2);
    box-sizing: border-box;
    background: transparent;
    cursor: pointer;
  }

  .range_input::-webkit-slider-runnable-track {
    width: 100%;
    height: 2px;
    background:
      linear-gradient(var(--c-main-3), var(--c-main)) 0 / var(--range-progress)
        100% no-repeat,
      var(--c-border);
  }

  .range_input::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 10px;
    height: 10px;
    margin-top: -4px;
    border: 0;
    border-radius: 50%;
    background: var(--c-main);
  }

  .range_input::-moz-range-track {
    width: 100%;
    height: 2px;
    border: 0;
    background: var(--c-border);
  }

  .range_input::-moz-range-progress {
    height: 2px;
    background: var(--c-main);
  }

  .range_input::-moz-range-thumb {
    width: 10px;
    height: 10px;
    border: 0;
    border-radius: 50%;
    background: var(--c-main);
  }
</style>
