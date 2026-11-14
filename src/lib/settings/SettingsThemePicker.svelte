<script lang="ts">
  import Button from "@/lib/components/Button.svelte";
  import G from "@/lib/components/G.svelte";
  import Icon from "@/lib/components/Icon.svelte";
  import T from "@/lib/components/T.svelte";
  import ThemeSwatch from "./ThemeSwatch.svelte";
  import { t } from "@/lib/utils/i18n";
  import type { AppTheme } from "@/lib/utils/settings";

  let { value, onChange }: { value: AppTheme; onChange: (value: AppTheme) => void } = $props();

  const themes: AppTheme[] = ["default", "ocean", "sunset", "purple", "yellow", "random"];
</script>

<div class="theme_options">
  {#each themes as theme (theme)}
    <Button full fill r="r1" aria-pressed={value === theme} onclick={() => onChange(theme)}>
      <G full align="c">
        <G align="c"><ThemeSwatch value={theme} /></G>
        <G full align="c"><T>{t("nt_theme_" + theme)}</T></G>
        {#if value === theme}
          <G align="c"><Icon name="Check" color="var(--c-text)" opacity={0.6} size={16} /></G>
        {/if}
      </G>
    </Button>
  {/each}
</div>

<style>
  .theme_options {
    display: flex;
    flex-direction: column;
    gap: calc(var(--gap) * 2);
    padding: calc(var(--gap) * 2);
  }
</style>
