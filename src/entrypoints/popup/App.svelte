<script lang="ts">
  import { onMount } from "svelte";
  import {
    addWebSite,
  } from "@/lib/DB/DB";
  import { loadSettings } from "@/lib/utils/settings";
  import { applyTheme } from "@/lib/utils/theme";

  async function getActiveTab() {
    const [lastFocusedTab] = await browser.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (lastFocusedTab) return lastFocusedTab;

    const [currentTab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    return currentTab;
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

  onMount(async () => {
    const settings = await loadSettings();
    applyTheme(settings.theme);
    try {
      const tab = await getActiveTab();
      if (tab) {
        inputUrlValue = tab.url ?? "";
        inputTitleValue = tab.title ?? "";
      }
    } catch {
      inputUrlValue = "";
      inputTitleValue = "";
    }
  });

  async function clickSave() {
    inputUrlValueErr = false;
    if (validator.isURL(inputUrlValue)) {
      const newWebSite = {
        domain: getDomainFromUrl(inputUrlValue),
        url: inputUrlValue,
        title: inputTitleValue.trim(),
      };
      await addWebSite(newWebSite);
      window.close();
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
        <Button bg='var(--c-text)' onclick={clickSave} full>
          <G full>
          <T align="c" color="var(--c-bg)">{t("nt_save")}</T>
        </G>
        </Button>
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
