<script lang="ts">
  import { browser } from "wxt/browser";
  import Button from "./components/Button.svelte";
  import G from "./components/G.svelte";
  import Popup from "./components/Popup.svelte";
  import { t } from "@/lib/utils/i18n";
  import T from "./components/T.svelte";
  import { openSourceProjects, repositoryUrl } from "./openSource";

  interface Props {
    onclickClose: () => void;
    onclickSupport: () => void;
  }

  let { onclickClose, onclickSupport }: Props = $props();
  const appVersion = browser.runtime.getManifest().version ?? '0.0.0';
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
    <G vertical full>
      <T type="l" bold>{t("nt_about_open_source_title")}</T>
      <div class="about_desc">
        <T type="m" color="var(--c-text-1)">{t("nt_about_open_source_desc")}</T>
      </div>
      <div class="source_links">
        <a href={repositoryUrl} target="_blank" rel="noopener noreferrer">{t("nt_about_source_code")}</a>
        <a href={`${repositoryUrl}/issues`} target="_blank" rel="noopener noreferrer">{t("nt_about_feedback")}</a>
      </div>
      <T type="s">{t("nt_about_project_license")}</T>
      <details>
        <summary>{t("nt_about_third_party_title")}</summary>
        <ul>
          {#each openSourceProjects as project}
            <li>
              <a href={project.url} target="_blank" rel="noopener noreferrer">{project.name}</a>
              <span>{project.license}</span>
            </li>
          {/each}
        </ul>
        <a href="/third-party-notices.txt" target="_blank" rel="noopener noreferrer">{t("nt_about_third_party_notices")}</a>
      </details>
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
  .source_links {
    display: flex;
    flex-wrap: wrap;
    gap: calc(var(--gap) * 2);
    padding: var(--gap);
  }
  details {
    box-sizing: border-box;
    width: 100%;
    padding: var(--gap);
    color: var(--c-text-1);
    font-size: var(--f-size-m);
  }
  summary {
    cursor: pointer;
    color: var(--c-text);
  }
  ul {
    list-style: none;
    padding: 0;
  }
  li {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--gap);
    padding-block: calc(var(--gap) / 2);
  }
  a {
    color: var(--c-text);
    overflow-wrap: anywhere;
  }
</style>
