<script lang="ts">
  import validator from "validator";
  import type { WebSite } from "@/lib/DB/DB";
  import Button from "./components/Button.svelte";
  import Icon from "./components/Icon.svelte";

  interface Props {
    ondSave: (items: WebSite) => void;
  }

  let { ondSave }: Props = $props();
  let inputUrlValue = $state("");
  let inputTitleValue = $state("");

  function clickSave() {
    if (!validator.isURL(inputUrlValue)) return;
    const newWebSite = {
      domain: getDomainFromUrl(inputUrlValue),
      url: inputUrlValue,
      title: inputTitleValue.trim(),
    };
    ondSave(newWebSite);
  }

  function getDomainFromUrl(input: string): string {
    try {
      const url = new URL(input);
      return url.hostname;
    } catch (e) {
      try {
        const url = new URL("https://" + input);
        return url.hostname;
      } catch {
        return "";
      }
    }
  }
</script>

<div>
  <input bind:value={inputUrlValue} placeholder="*网址" />
  <input bind:value={inputTitleValue} placeholder="名称" />

  {@render temInput()}
  <Button text="save" onclick={clickSave} />
</div>

{#snippet temInput()}
  <div class="input_g">
    <input
      class="input"
      name="title"
      bind:value={inputTitleValue}
      placeholder="名称"
    />
    <Button iconName="X" mini />
  </div>
{/snippet}

<style>
  .input_g {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
    background-color: var(--c-bg1);
    border-radius: var(--r);
    padding: var(--gap);
  }
  .input {
    color: var(--c-text);
    font-size: var(--f-size-m);
    background-color: unset;
    /* background-color: antiquewhite; */
    border: none;
    padding: var(--gap);
    width: 100%;
    box-sizing: border-box;
  }
  .input::placeholder {
    color: var(--c-text-2);
  }
  .input:focus {
    outline: none;
  }
</style>
