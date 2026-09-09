<script lang="ts">
  import { onMount } from "svelte";
  import { addWebSite } from "@/lib/DB/DB";
  import { loadSettings } from "@/lib/utils/settings";
  import { applyTheme } from "@/lib/utils/theme";
  import { ensureConfigReady } from "@/lib/browser/configReady";

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
  import { resolvePublicAssetUrl } from "@/lib/utils/assetUrl";
  import { getWebsiteCardColors } from "@/lib/utils/websiteCardColors";

  let inputUrlValue = $state("");
  let inputTitleValue = $state("");
  let inputUrlValueErr = $state(false);

  onMount(async () => {
    await ensureConfigReady();
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
      const domain = getDomainFromUrl(inputUrlValue);
      const newWebSite = {
        domain,
        url: inputUrlValue,
        title: inputTitleValue.trim(),
        ...(await getWebsiteCardColors(inputUrlValue, domain)),
      };
      await addWebSite(newWebSite);
      window.close();
    } else {
      inputUrlValueErr = true;
    }
  }

  async function openNewTabPage() {
    const url = resolvePublicAssetUrl("newtab.html");
    await browser.tabs.create({ url });
    // window.close();
  }
</script>

<main>
  <G align="c">
    <G full>
      <G>
        <img class="logo" src="/Mooogor.svg" alt="Mooogor Start" />
      </G>
    </G>
    <Button fill onclick={openNewTabPage}>
      <G>
        <T nowrap>{t("nt_popup_open_newtab")}</T>
      </G>
    </Button>
  </G>
    <G vertical full>
      <G full align="c">
        <T>{t("nt_popup_add_to_common")}</T>
      </G>
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
        <Button bg="var(--c-text)" onclick={clickSave} full>
          <G full>
            <T align="c" color="var(--c-bg)">{t("nt_popup_add")}</T>
          </G>
        </Button>
      </G>
    </G>
</main>

<style>
  main {
    width: 260px;
    background-color: var(--c-bg1);
    padding: var(--gap);
    display: flex;
    flex-direction: column;
  }
  .logo {
    width: 24px;
  }
</style>
