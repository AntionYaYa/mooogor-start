<script lang="ts">
  import { slide } from "svelte/transition";
  import Checkbox from "./Checkbox.svelte";
  import Button from "./Button.svelte";
  import Icon from "./Icon.svelte";
  import G from "./G.svelte";
  import T from "./T.svelte";
  import { t } from "@/lib/utils/i18n";

  interface Props {
    show: boolean;
    count: number;
    allSelected: boolean;
    indeterminate?: boolean;
    disabled?: boolean;
    showDeleteText?: boolean;
    showMoveText?: boolean;
    onselectall: () => void;
    ondelete: () => void;
    onmove?: () => void;
    onclose?: () => void;
  }

  let {
    show,
    count,
    allSelected,
    indeterminate = false,
    disabled = false,
    showDeleteText = false,
    showMoveText = false,
    onselectall,
    ondelete,
    onmove,
    onclose,
  }: Props = $props();
</script>

{#if show}
  <div class="batch_bar" transition:slide={{ duration: 180 }}>
    <div class="batch_inner">
      <Checkbox
        checked={allSelected}
        {indeterminate}
        {disabled}
        skipTabFocus
        onchange={onselectall}
      />
      <T type="s" nowrap>{count}</T>
      <div class="batch_spacer"></div>
      {#if onmove}
        <Button onclick={onmove} disabled={count === 0 || disabled} fill>
          <G align="c">
            <Icon name="FolderOpen" color="var(--c-text)" />
            {#if showMoveText}
              <T nowrap>{t("nt_move")}</T>
            {/if}
          </G>
        </Button>
      {/if}
      <Button onclick={ondelete} disabled={count === 0 || disabled} fill>
        <G align="c">
          <Icon name="Trash2" color="var(--c-red)" />
          {#if showDeleteText}
            <T color="var(--c-red)" nowrap>{t("nt_delete")}</T>
          {/if}
        </G>
      </Button>
      {#if onclose}
        <Button onclick={onclose} disabled={disabled}>
          <G align="c">
            <Icon name="X" color="var(--c-text)" />
          </G>
        </Button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .batch_bar {
    display: flex;
    justify-content: center;
    width: 100%;
    box-sizing: border-box;
  }
  .batch_inner {
    display: flex;
    align-items: center;
    gap: var(--gap);
    padding: var(--gap);
    background-color: var(--c-bg1);
    border-radius: var(--r1);
    box-shadow: var(--shadow);
    pointer-events: auto;
    max-width: 400px;
    width: 100%;
    box-sizing: border-box;
  }
  .batch_spacer {
    flex: 1;
    min-width: 0;
  }
</style>
