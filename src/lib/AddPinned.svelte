<script lang="ts">
  import validator from "validator";
  import type { WebSite } from "@/lib/DB/DB";
  import { getDomainFromUrl } from "@/lib/DB/DB";
  import Button from "./components/Button.svelte";
  import Input from "./components/Input.svelte";
  import G from "./components/G.svelte";
  import Popup from "./components/Popup.svelte";
  import Shake from "./components/Shake.svelte";

  interface Props {
    urlValue?:string;
    titleValue?:string;
    onSave: (newWebSite: WebSite) => void;
    onclickClose: () => void;
  }

  let {urlValue ,titleValue,onSave, onclickClose }: Props = $props();
  let inputUrlValue = $state("");
  let inputTitleValue = $state("");
  let inputUrlValueErr = $state(false);

  onMount(()=>{
    if (urlValue) {
      inputUrlValue = urlValue
    }
    if (titleValue) {
      inputTitleValue = titleValue
    }
  })

  function clickSave() {
    inputUrlValueErr = false;
    if (validator.isURL(inputUrlValue)) {
      const newWebSite = {
        domain: getDomainFromUrl(inputUrlValue),
        url: inputUrlValue,
        title: inputTitleValue.trim(),
      };
      onSave(newWebSite);
      inputUrlValue = inputTitleValue = "";
      onclickClose();
    } else {
      inputUrlValueErr = true;
    }
  }
</script>

<Popup title="添加到常用" {onclickClose}>
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
      <Button text="保存" fill onclick={clickSave} full alignT='c' />
    </G>
  </G>
</Popup>

<style>
</style>
