<script lang="ts">
  import Icon from "@/lib/components/Icon.svelte";
  import type { AppTheme } from "@/lib/utils/settings";

  let { value, active = false }: { value: AppTheme; active?: boolean } = $props();
</script>

<span class="theme_swatch" class:random={value === "random" && !active}
    data-theme={value === "random" ? undefined : value} aria-hidden="true">
  {#if value === "random" && !active}
    <Icon name="Shuffle" color="var(--c-text)" opacity={0.6} size={14} />
  {/if}
</span>

<style>
  .theme_swatch {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--c-main), var(--c-main-1));
  }
  .random {
    background: var(--c-mask);
  }
</style>
