<script lang="ts">
  import G from "./components/G.svelte";
  import Popup from "./components/Popup.svelte";
  import { t } from "@/lib/utils/i18n";
  import T from "./components/T.svelte";

  interface Props {
    onclickClose: () => void;
  }

  let { onclickClose }: Props = $props();
</script>

<Popup title={t("nt_settings_about")} {onclickClose} type="m">
  <G>
    <G>
      <G>
        <img class="logo" src="/Mooogor.svg" alt="Mooogor2" />
      </G>
    </G>
  </G>
  <G  vertical>
    <G  vertical>
      <T type="l" bold>{t("nt_about_name_origin_title")}</T>
      <T type="m"
        >{t("nt_about_name_origin_desc")}</T
      >
    </G>
    <G  vertical>
      <T type="l" bold>{t("nt_about_design_goal_title")}</T>
      <T type="m"
        >{t("nt_about_design_goal_desc")}</T
      >
      <T type="m">antion1212@gmail.com</T>
    </G>
    <G  vertical>
      <T type="l" bold>{t("nt_about_free_title")}</T>
      <T type="m"
        >{t("nt_about_free_desc")}</T
      >
    </G>
    <G full vertical>
      <T type="m" align="r" bold>Ashton</T>
    </G>
  </G>
</Popup>

<style>
  .logo {
    width: 40px;
  }
</style>
