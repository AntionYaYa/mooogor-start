<script lang="ts">
  import {
    DEFAULT_BACKGROUND_CONFIG,
    PRESET_BACKGROUND_URLS,
    type BackgroundColorScheme,
    type BackgroundConfig,
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
  }

  type NumericSetting = "fadePosition" | "scale" | "positionX" | "positionY";

  let { config, onPreview, onCommit, onOpenAdd }: Props = $props();
  let loadedUrls = $state<Record<string, boolean>>({});

  let backgroundUrls = $derived([
    ...PRESET_BACKGROUND_URLS,
    ...config.customUrls.filter(
      (url) =>
        !PRESET_BACKGROUND_URLS.includes(
          url as (typeof PRESET_BACKGROUND_URLS)[number],
        ),
    ),
  ]);
  let currentColorScheme = $derived(config.colorSchemes[config.url]);

  function disableBackground() {
    onCommit({ ...config, enabled: false });
  }

  function selectBackground(url: string) {
    onCommit({ ...config, enabled: true, url });
  }

  function removeCustomUrl(event: MouseEvent, url: string) {
    event.stopPropagation();
    const customUrls = config.customUrls.filter((item) => item !== url);
    const colorSchemes = { ...config.colorSchemes };
    delete colorSchemes[url];
    onCommit({
      ...config,
      enabled: config.url === url ? false : config.enabled,
      url: config.url === url ? DEFAULT_BACKGROUND_CONFIG.url : config.url,
      customUrls,
      colorSchemes,
    });
  }

  function selectModeColor(
    mode: "light" | "dark",
    color: string,
    scheme: BackgroundColorScheme,
  ) {
    const nextScheme = {
      ...scheme,
      [mode === "light" ? "lightColor" : "darkColor"]: color,
    };
    onCommit({
      ...config,
      colorSchemes: {
        ...config.colorSchemes,
        [config.url]: nextScheme,
      },
    });
  }

  function getRangeValue(event: Event) {
    return Number((event.currentTarget as HTMLInputElement).value);
  }

  function previewNumber(key: NumericSetting, event: Event) {
    onPreview({ ...config, [key]: getRangeValue(event) });
  }

  function commitNumber(key: NumericSetting, event: Event) {
    onCommit({ ...config, [key]: getRangeValue(event) });
  }

  function resetNumber(key: NumericSetting) {
    onCommit({ ...config, [key]: DEFAULT_BACKGROUND_CONFIG[key] });
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

    {#each backgroundUrls as url, index (url)}
      <div class="background_card">
        <button
          type="button"
          class="background_choice"
          class:selected={config.enabled && config.url === url}
          title={`${t("nt_settings_background_option")} ${index + 1}`}
          onclick={() => selectBackground(url)}
        >
          {#if !loadedUrls[url]}
            <span class="thumbnail_skeleton" aria-hidden="true"></span>
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
        {#if config.customUrls.includes(url)}
          <button
            type="button"
            class="remove_background"
            aria-label={t("nt_settings_background_remove")}
            title={t("nt_settings_background_remove")}
            onclick={(event) => removeCustomUrl(event, url)}
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

  {#if config.enabled && currentColorScheme}
    <div class="color_modes">
      {@render colorMode(
        t("nt_settings_background_light_color"),
        "light",
        currentColorScheme,
      )}
      {@render colorMode(
        t("nt_settings_background_dark_color"),
        "dark",
        currentColorScheme,
      )}
    </div>
  {/if}

  {#if config.enabled}
    <div class="background_controls">
      {@render rangeControl(
        t("nt_settings_background_fade"),
        "fadePosition",
        config.fadePosition,
        0,
        100,
        "%",
      )}
      {@render rangeControl(
        t("nt_settings_background_scale"),
        "scale",
        config.scale,
        100,
        200,
        "%",
      )}
      {@render rangeControl(
        t("nt_settings_background_position_x"),
        "positionX",
        config.positionX,
        0,
        100,
        "%",
      )}
      {@render rangeControl(
        t("nt_settings_background_position_y"),
        "positionY",
        config.positionY,
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
  scheme: BackgroundColorScheme,
)}
  <div class="color_mode">
    <T type="s">{label}</T>
    <div class="color_options">
      {#each scheme.options as option (option.base)}
        {@const color = mode === "light" ? option.light : option.dark}
        <button
          type="button"
          class="color_option"
          class:selected_color={color ===
            (mode === "light" ? scheme.lightColor : scheme.darkColor)}
          title={color}
          aria-label={`${label} ${color}`}
          onclick={() => selectModeColor(mode, color, scheme)}
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
    gap: var(--gap);
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

  .thumbnail_skeleton {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      100deg,
      var(--c-mask) 25%,
      var(--c-mask1) 50%,
      var(--c-mask) 75%
    );
    background-size: 200% 100%;
    animation: skeleton 1.2s linear infinite;
  }

  @keyframes skeleton {
    from {
      background-position: 100% 0;
    }
    to {
      background-position: -100% 0;
    }
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
    gap: var(--gap);
    padding: var(--gap);
    box-sizing: border-box;
  }

  .color_options {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: var(--gap);
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

  .range_header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .range_actions {
    display: flex;
    align-items: center;
    gap: var(--gap);
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
