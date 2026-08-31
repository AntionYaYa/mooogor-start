<script lang="ts">
  import Icon from "@/lib/components/Icon.svelte";
  import T from "@/lib/components/T.svelte";
  import { t } from "@/lib/utils/i18n";
  import type { AppTheme } from "@/lib/utils/settings";

  interface Props {
    value: AppTheme;
    onChange: (value: AppTheme) => void;
  }

  let { value, onChange }: Props = $props();

  const themes: Array<{
    value: Exclude<AppTheme, "random">;
    labelKey: string;
  }> = [
    {
      value: "default",
      labelKey: "nt_theme_default",
    },
    {
      value: "ocean",
      labelKey: "nt_theme_ocean",
    },
    {
      value: "sunset",
      labelKey: "nt_theme_sunset",
    },
    {
      value: "purple",
      labelKey: "nt_theme_purple",
    },
    {
      value: "yellow",
      labelKey: "nt_theme_yellow",
    },
  ];
</script>

<div class="theme_picker">
  <T type="s" color="var(--c-text-1)">{t("nt_settings_theme")}</T>
  <div class="theme_options">
    {#each themes as theme (theme.value)}
      <button
        type="button"
        class="theme_option"
        class:selected={value === theme.value}
        title={t(theme.labelKey)}
        aria-label={t(theme.labelKey)}
        aria-pressed={value === theme.value}
        onclick={() => onChange(theme.value)}
      >
        <span class="theme_swatch" data-theme={theme.value}></span>
      </button>
    {/each}

    <button
      type="button"
      class="theme_option random_option"
      class:selected={value === "random"}
      title={t("nt_theme_random")}
      aria-label={t("nt_theme_random")}
      aria-pressed={value === "random"}
      onclick={() => onChange("random")}
    >
      <span class="random_swatch">
        <Icon name="Shuffle" color="var(--c-text)" size={16} />
      </span>
    </button>
  </div>
</div>

<style>
  .theme_picker {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: var(--gap);
    box-sizing: border-box;
  }

  .theme_options {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    align-items: center;
    gap: var(--gap);
    padding: var(--gap);
    box-sizing: border-box;
  }

  .theme_option {
    width: 100%;
    aspect-ratio: 1;
    padding: 2px;
    border: 2px solid transparent;
    border-radius: 50%;
    box-sizing: border-box;
    background: transparent;
    cursor: pointer;
  }

  .theme_option.selected {
    border-color: var(--c-main);
  }

  .theme_swatch,
  .random_swatch {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }

  .theme_swatch {
    background: linear-gradient(135deg, var(--c-main), var(--c-main-1));
  }

  .random_swatch {
    background-color: var(--c-mask);
  }

  .random_option {
    position: relative;
  }

  .theme_option:focus-visible {
    outline: 2px solid var(--c-text);
    outline-offset: 2px;
  }
</style>
