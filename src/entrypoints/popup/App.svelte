<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "wxt/browser";
  import validator from "validator";
  import { addWebSite, addEngine, getAllWebSiteFolders, getDomainFromUrl, FALLBACK_ENGINE_CATEGORY_ID } from "@/lib/DB/DB";
  import { getEngineConfigSnapshot } from "@/lib/DB/configStorage";
  import { loadSettings } from "@/lib/utils/settings";
  import { applyTheme } from "@/lib/utils/theme";
  import { ensureConfigReady } from "@/lib/browser/configReady";
  import { t, setLanguage } from "@/lib/utils/i18n";
  import { resolvePublicAssetUrl } from "@/lib/utils/assetUrl";
  import { getWebsiteCardColors } from "@/lib/utils/websiteCardColors";
  import { buildEngineFaviconUrl } from "@/lib/settings/searchEngines";
  import { getSearchUrlParameters, replaceSearchUrlParameter } from "@/lib/search/searchUrlParameters";
  import Button from "@/lib/components/Button.svelte";
  import Select, { type SelectOption } from "@/lib/components/Select.svelte";
  import EngineIcon from "@/lib/EngineIcon.svelte";
  import G from "@/lib/components/G.svelte";
  import T from "@/lib/components/T.svelte";
  import Icon from "@/lib/components/Icon.svelte";
  import Divider from "@/lib/components/Divider.svelte";

  let ready = $state(false);
  let saving = $state(false);
  let error = $state("");
  let mode = $state<"website" | "engine">("website");
  let sourceUrl = $state("");
  let siteTitle = $state("");
  let siteIcon = $state<string | undefined>();
  let siteHost = $state("");
  let titles = $state({ website: "", engine: "" });
  let engineUrl = $state("");
  let category = $state("");
  let folder = $state("");
  let parameter = $state("");
  let folderOptions = $state<SelectOption[]>([]);
  let categoryOptions = $state<SelectOption[]>([]);
  let parameterOptions = $state<SelectOption[]>([]);

  onMount(() => { void initialize(); });

  function focusName(node: HTMLInputElement) {
    node.focus();
    node.select();
  }

  async function initialize() {
    try {
      await ensureConfigReady();
      const settings = await loadSettings();
      applyTheme(settings.theme);
      await setLanguage(settings.language);
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) throw new Error("Active tab URL is unavailable");
      const url = new URL(tab.url);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        error = t("nt_settings_search_engine_url_invalid");
        return;
      }
      sourceUrl = engineUrl = tab.url;
      siteTitle = tab.title ?? "";
      titles = { website: siteTitle, engine: siteTitle };
      siteIcon = tab.favIconUrl;
      siteHost = url.hostname;
      parameterOptions = getSearchUrlParameters(sourceUrl);
      if (parameterOptions.length) selectParameter(parameterOptions[0].value);
      const [folders, snapshot] = await Promise.all([getAllWebSiteFolders(), getEngineConfigSnapshot()]);
      folderOptions = [
        { label: t("nt_no_folder"), value: "", sel: true },
        ...folders.map((item) => ({ label: item.title, value: String(item.id), sel: false })),
      ];
      categoryOptions = snapshot.categories
        .filter((item) => item.id !== FALLBACK_ENGINE_CATEGORY_ID)
        .map((item) => ({ label: item.name, value: item.id, sel: false }));
      if (!categoryOptions.length) throw new Error("No search engine categories available");
      category = categoryOptions[0].value;
      ready = true;
    } catch (cause) {
      console.error("Failed to initialize popup", cause);
      error = t("nt_common_save_failed");
    }
  }

  function switchMode(next: "website" | "engine") {
    mode = next;
    error = "";
  }

  function selectParameter(value: string) {
    parameter = value;
    engineUrl = replaceSearchUrlParameter(sourceUrl, value);
    error = "";
  }

  async function save() {
    if (!ready || saving) return;
    error = "";
    if (mode === "engine") {
      if (parameter === "") return;
      if (!titles.engine.trim()) { error = t("nt_settings_search_engine_name_required"); return; }
      if (!engineUrl.trim()) { error = t("nt_settings_search_engine_url_required"); return; }
      if (!engineUrl.includes("%s")) { error = t("nt_settings_search_engine_url_keyword"); return; }
    }
    const url = (mode === "website" ? sourceUrl : engineUrl).trim();
    if (!validator.isURL(url.replace("%s", "search"), { protocols: ["http", "https"], require_protocol: true })) {
      error = t("nt_settings_search_engine_url_invalid");
      return;
    }
    saving = true;
    try {
      if (mode === "website") {
        const domain = getDomainFromUrl(url);
        await addWebSite({
          domain, url, title: titles.website.trim(),
          folderId: folder === "" ? undefined : Number(folder),
          ...(await getWebsiteCardColors(url, domain)),
        });
      } else {
        await addEngine({
          title: titles.engine.trim(), engineUrl: url, category, enabled: true,
          faviconUrl: buildEngineFaviconUrl(url),
        });
      }
      window.close();
    } catch (cause) {
      console.error("Failed to save popup form", cause);
      error = t("nt_common_save_failed");
    } finally {
      saving = false;
    }
  }

  async function openNewTabPage() {
    await browser.tabs.create({ url: resolvePublicAssetUrl("newtab.html") });
    window.close();
  }
</script>

<main>
  <G vertical full>
  {#if ready}
    <G full align="c">
      <EngineIcon src={siteIcon} engineUrl={sourceUrl} alt={siteTitle} size={30} />
      <G vertical full>
        <input class="site_title" name="site-title" type="text"
          placeholder={t("nt_input_name")} aria-label={t("nt_input_name")}
          bind:value={titles[mode]} disabled={saving} use:focusName
          onfocus={(event) => event.currentTarget.select()} />
        <T nowrap type="s" color="var(--c-text-1)">{siteHost}</T>
      </G>
    </G>
    <G vertical full>
      <div class="type_switch" role="group" aria-label={t("nt_add")}>
      <Button full r="r_o" fill={mode === "website"} title={t("nt_popup_add_to_common")} disabled={saving} onclick={() => switchMode("website")}>
        <G full vertical align="c"><Icon name="Globe" color="var(--c-text)" /><T type="s" align="c" fullWidth={false}>{t("nt_tab_common")}</T></G>
      </Button>
      <Button full r="r_o" fill={mode === "engine"} title={t("nt_popup_add_to_search")} disabled={saving} onclick={() => switchMode("engine")}>
        <G full vertical align="c"><Icon name="Search" color="var(--c-text)" /><T type="s" align="c" fullWidth={false}>{t("nt_popup_search_engines")}</T></G>
      </Button>
      </div>
    </G>
    <G vertical full gap>
      {#if mode === "website"}
        <G vertical full gap>
          <T type="s" color="var(--c-text-1)">{t("nt_bookmark_folder")}</T>
          <Select options={folderOptions.map((item) => ({ ...item, sel: item.value === folder }))} onChange={(value) => (folder = value)} disabled={saving} />
        </G>
      {:else}
        <G vertical full gap>
          <T type="s" color="var(--c-text-1)">{t("nt_settings_search_engine_category")}</T>
          <Select options={categoryOptions.map((item) => ({ ...item, sel: item.value === category }))} onChange={(value) => (category = value)} disabled={saving} />
        </G>
        <G vertical full gap>
          <T type="s" color="var(--c-text-1)">{t("nt_popup_search_parameter")}</T>
          {#if parameterOptions.length}
            <Select options={parameterOptions.map((item) => ({ ...item, sel: item.value === parameter }))} onChange={selectParameter} disabled={saving} />
          {:else}
            <T type="s" color="var(--c-text-1)">{t("nt_popup_search_no_parameters")}</T>
          {/if}
         <T type="m" color="var(--c-text-1)">{#each engineUrl.split("%s") as part, index}{#if index > 0}<strong style="color: var(--c-text);">%s</strong>{/if}{part}{/each}</T>
        </G>
      {/if}
      {#if error}<T color="var(--c-red)">{error}</T>{/if}
      <G full>
        <Button full r="r1" bg="var(--c-text)" disabled={saving || (mode === "engine" && parameter === "")} onclick={() => void save()}>
          <G full><G full><T align="c" color="var(--c-bg)">{t(mode === "website" ? "nt_add_pinned_title" : "nt_popup_add_to_search")}</T></G></G>
        </Button>
      </G>
    </G>
  {:else if error}
    <T color="var(--c-red)">{error}</T>
  {/if}
  <Divider />
  <G full>
    <Button full onclick={() => void openNewTabPage()}>
      <G full align="c">
        <G><img class="logo" src={resolvePublicAssetUrl("Mooogor.svg")} alt="" /></G>
        <T nowrap type="s" color="var(--c-text-1)">Mooogor Start</T>
        <G><Icon name="ArrowUpRight" size={16} color="var(--c-text-1)" /></G>
      </G>
    </Button>
  </G>
  </G>
</main>

<style>
  main {
    width: 320px;
    box-sizing: border-box;
    background-color: var(--c-bg);
  }
  .url_preview {
    width: 100%;
    box-sizing: border-box;
    padding: calc(var(--gap) * 2);
    color: var(--c-text-1);
    font-size: var(--f-size-s);
    overflow-wrap: anywhere;
    max-height: 100px;
    overflow-y: auto;
    user-select: text;
  }
  .site_title {
    width: 100%;
    min-width: 0;
    height: 28px;
    box-sizing: border-box;
    padding: 0 var(--gap);
    border: none;
    border-radius: var(--r);
    background: transparent;
    color: var(--c-text);
    font: inherit;
    font-size: var(--f-size-m);
    caret-color: var(--c-main);
  }
  .site_title:focus-visible { outline: 1px solid var(--c-border); }
  .site_title::selection { background: var(--c-main); color: var(--c-bg); }
  .type_switch {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px;
    width: calc(100% - var(--gap) * 2);
    margin: var(--gap);
    padding: 2px;
    border: 2px solid var(--c-mask);
    border-radius: var(--r1);
    box-sizing: border-box;
  }
  .url_preview strong { color: var(--c-text); font-weight: var(--f-bold); }
  :global(body) { font-family: system-ui, sans-serif; }
  .logo { width: 20px; height: 20px; }
</style>
