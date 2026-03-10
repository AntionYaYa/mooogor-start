<script lang="ts">
  import Button from "./components/Button.svelte";
  import G from "./components/G.svelte";
  import Popup from "./components/Popup.svelte";
  import { t } from "@/lib/utils/i18n";
  import T from "./components/T.svelte";

  interface Props {
    onclickClose: () => void;
    onclickSupport: () => void;
  }

  type ExtensionRuntime = {
    runtime?: {
      getManifest?: () => {
        version?: string;
      };
    };
  };

  let { onclickClose, onclickSupport }: Props = $props();
  const extensionApi = globalThis as typeof globalThis & {
    browser?: ExtensionRuntime;
    chrome?: ExtensionRuntime;
  };
  const appVersion =
    extensionApi.browser?.runtime?.getManifest?.().version ??
    extensionApi.chrome?.runtime?.getManifest?.().version ??
    '0.0.0';
</script>

<Popup title={t("nt_settings_about")} {onclickClose} type="l">
  <G>
    <G align='c'>
      <G align='c'>
        <img class="logo" src="/Mooogor.svg" alt="Mooogor Start" />
      </G>
      <G align='c'>
        <T type="m">V{appVersion}</T>
      </G>
    </G>
  </G>
  <G  vertical>
    <G  vertical>
      <T type="l" bold>{t("nt_about_name_origin_title")}</T>
      <div class="about_desc">
        <T type="m" color='var(--c-text-1)'
          >{t("nt_about_name_origin_desc")}</T
        >
      </div>
    </G>
    <G  vertical>
      <T type="l" bold>{t("nt_about_design_goal_title")}</T>
      <div class="about_desc">
        <T type="m" color='var(--c-text-1)'
          >{t("nt_about_design_goal_desc")}</T
        >
      </div>
      <a href="mailto:antion1212@gmail.com" type="Email">
        <T type="m" color='var(--c-text)' >antion1212@gmail.com</T>
      </a>
    </G>
    <G  vertical>
      <T type="l" bold>{t("nt_about_free_title")}</T>
      <div class="about_desc">
        <T type="m" color='var(--c-text-1)'
          >{t("nt_about_free_desc")}</T
        >
      </div>
    </G>
    <G full>
      <Button bg='var(--c-text)' onclick={onclickSupport}>
      <G>
        <T color="var(--c-bg)">{t("nt_about_support_button")}</T>
      </G>
      </Button>
    </G>
    <G full>
      <T type="m" bold align='r'>Ashton</T>
    </G>
  </G>
</Popup>

<style>
  .logo {
    width: 40px;
  }
  a{
    text-decoration-color:var(--c-text-2);
  }
  .about_desc :global(p) {
    white-space: pre-line;
  }
</style>
