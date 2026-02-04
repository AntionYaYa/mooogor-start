<script lang="ts">
  import validator from "validator";
  import type { WebSite } from "@/lib/DB/DB";
  import { getDomainFromUrl } from "@/lib/DB/DB";
  import Button from "./components/Button.svelte";
  import Icon from "./components/Icon.svelte";
  import Input from "./components/Input.svelte";
  import G from "./components/G.svelte";
  import Popup from "./components/Popup.svelte";
  import T from "./components/T.svelte";
  import Shake from "./components/Shake.svelte";

  interface Props {
    ondSave: (newWebSite: WebSite) => void;
    onclickClose: () => void;
  }

  let { ondSave, onclickClose }: Props = $props();
  let inputUrlValue = $state("");
  let inputTitleValue = $state("");
  let inputUrlValueErr = $state(false);

  function clickSave() {
    inputUrlValueErr = false;
    if (validator.isURL(inputUrlValue)) {
      const newWebSite = {
        domain: getDomainFromUrl(inputUrlValue),
        url: inputUrlValue,
        title: inputTitleValue.trim(),
      };
      ondSave(newWebSite);
      inputUrlValue = inputTitleValue = "";
      onclickClose();
    } else {
      inputUrlValueErr = true;
    }
  }
</script>

<Popup title="Add" {onclickClose}>
  <G full>
    <Shake shake={inputUrlValueErr}>
      <Input
        name="url"
        type="url"
        placeholder="*网址"
        bind:value={inputUrlValue}
      />
    </Shake>
  </G>
  <G full>
    <Input
      name="title"
      type="text"
      placeholder="名称"
      bind:value={inputTitleValue}
    />
  </G>
  <G full>
    <G full>
      <Button text="Save" fill onclick={clickSave} full />
    </G>
  </G>
</Popup>

<style>
</style>
