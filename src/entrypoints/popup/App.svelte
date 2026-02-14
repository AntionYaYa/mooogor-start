<script lang="ts">
 import {
    addWebSite,
  } from "@/lib/DB/DB";

 async function getActiveTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}
import validator from "validator";
  import { getDomainFromUrl } from "@/lib/DB/DB";
  import Button from "@/lib/components/Button.svelte";
  import Input from "@/lib/components/Input.svelte";
  import G from "@/lib/components/G.svelte";
  import T from "@/lib/components/T.svelte";
  import Shake from "@/lib/components/Shake.svelte";
  import { t } from "@/lib/utils/i18n";

  let inputUrlValue = $state("");
  let inputTitleValue = $state("");
  let inputUrlValueErr = $state(false);

  onMount(async()=>{
    const tab =  await getActiveTab()
    if (tab) {
      inputUrlValue = tab.url??''
      inputTitleValue = tab.title??''
    }
  })

  async function clickSave() {
    inputUrlValueErr = false;
    if (validator.isURL(inputUrlValue)) {
      const newWebSite = {
        domain: getDomainFromUrl(inputUrlValue),
        url: inputUrlValue,
        title: inputTitleValue.trim(),
      };
      await addWebSite(newWebSite);
      window.close()
    } else {
      inputUrlValueErr = true;
    }
  }
</script>


<main>
  <G full align="c">
    <T>{t("nt_add_pinned_title")}</T>
  </G>
  <G vertical full>
    <G full>
      <Shake shake={inputUrlValueErr}>
        <Input
          name="url"
          type="url"
          placeholder={t("nt_input_url")}
          bind:value={inputUrlValue}
        />
      </Shake>
    </G>
    <G full>
      <Input
        name="title"
        type="text"
        placeholder={t("nt_input_name")}
        bind:value={inputTitleValue}
      />
    </G>
    <G full>
      <G full>
        <Button text={t("nt_save")} fill onclick={clickSave} full alignT='c' />
      </G>
    </G>
  </G>
</main>
<style>
  main{
    width: 260px;
    background-color: var(--c-bg1);
    padding: var(--gap);
    display: flex;
    flex-direction: column;
  }
</style>
