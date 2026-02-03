<script lang="ts">
  import validator from "validator";
  import type { WebSite } from "@/lib/DB/DB";
  import Button from "./components/Button.svelte";
  import Icon from "./components/Icon.svelte";
  import Input from "./components/Input.svelte";
  import G from "./components/G.svelte";
  import Popup from "./components/Popup.svelte";

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

<Popup>
  <Input name="url" type="url" placeholder="*网址" bind:value={inputUrlValue} />

  <Input
    name="title"
    type="text"
    placeholder="名称"
    bind:value={inputTitleValue}
  />
  <Button text="save" fill onclick={clickSave} />
</Popup>

<style>
</style>
