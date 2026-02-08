<script lang="ts">
    import { slide } from "svelte/transition";
  import T from "./components/T.svelte";

  interface Props {
    active: boolean;
    onDrop: () => void;
  }

  let { active, onDrop }: Props = $props();
  let inBox = $state(false);

  function handleDragEnter() {
    inBox = true;
  }

  function handleDragLeave() {
    inBox = false;
  }

  function handleDrop() {
    inBox = false;
    onDrop();
  }
</script>

{#if active}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="darg_g" transition:slide={{duration:300}}>
    <span class="darg_text">
      <T align="c">添加到常用</T>
    </span>
    <div
      class="darg_box"
      class:inbox={inBox}
      ondragenter={handleDragEnter}
      ondragleave={handleDragLeave}
      ondragover={(e) => e.preventDefault()}
      ondrop={handleDrop}
    ></div>
  </div>
{/if}

<style>
  .darg_text {
    position: absolute;
  }
  .darg_g {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 10;
    width: 100%;
    height: 200px;
    box-sizing: border-box;
    display: flex;
    padding: var(--gap);
    align-items: center;
    justify-content: center;
    flex-direction: row;
  }
  .darg_box {
    display: flex;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    background-color: var(--c-bg1);
    padding: var(--gap);
    border-radius: var(--r);
    align-items: center;
    justify-content: center;
    flex-direction: row;
    border: var(--c-text-2) dashed 2px;
  }
  .inbox {
    border: var(--c-text) dashed 2px;
  }
</style>
