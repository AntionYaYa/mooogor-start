<script lang="ts">
  import { browser } from "wxt/browser";
  import Button from "./components/Button.svelte";
  import G from "./components/G.svelte";
  import Popup from "./components/Popup.svelte";
  import { t } from "@/lib/utils/i18n";
  import { slide } from "svelte/transition";
  import Icon from "./components/Icon.svelte";
  import T from "./components/T.svelte";

// License identifiers verified against the installed packages. Full texts are
// generated separately so copyright and NOTICE statements ship with the app.
const openSourceProjects = [
  { name: 'WXT', url: 'https://wxt.dev', license: 'MIT' },
  { name: 'Svelte', url: 'https://svelte.dev', license: 'MIT' },
  { name: 'Lucide', url: 'https://lucide.dev', license: 'ISC' },
  { name: 'Dexie.js', url: 'https://dexie.org', license: 'Apache-2.0' },
  { name: 'svelte-dnd-action', url: 'https://github.com/isaacHagoel/svelte-dnd-action', license: 'MIT' },
  { name: 'Color Thief', url: 'https://github.com/lokesh/color-thief', license: 'MIT' },
  { name: 'QR Code Styling', url: 'https://qr-code-styling.com', license: 'MIT' },
  { name: 'validator.js', url: 'https://github.com/validatorjs/validator.js', license: 'MIT' },
  { name: 'webext-bridge', url: 'https://github.com/zikaari/webext-bridge', license: 'MIT' },
];


  interface Props {
    onclickClose: () => void;
    onclickSupport: () => void;
  }

  let { onclickClose, onclickSupport }: Props = $props();
  let showOpenSourceProjects = $state(false);
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
    <G vertical full>
      <button class="project_toggle" type="button"
        onclick={() => (showOpenSourceProjects = !showOpenSourceProjects)}
        aria-expanded={showOpenSourceProjects}>
        {t("nt_about_third_party_title")}
        <Icon name={showOpenSourceProjects ? "ChevronDown" : "ChevronRight"}
          color="var(--c-text)" opacity={0.6} size={12} />
      </button>
      {#if showOpenSourceProjects}
        <div class="project_list" transition:slide={{ duration: 200 }}>
          <ul>
            {#each openSourceProjects as project}
              <li>
                <a href={project.url} target="_blank" rel="noopener noreferrer">{project.name}</a>
                <span>{project.license}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
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
    <footer>
      <a class="license_link" href="/third-party-notices.txt" target="_blank" rel="noopener noreferrer">
        <T type="s" color="var(--c-text-2)">{t("nt_about_project_license")}</T>
      </a>
      <T type="m" bold nowrap fullWidth={false}>Antion</T>
    </footer>
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
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--gap);
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
  }
  footer > :global(p) {
    flex: none;
  }
  .license_link {
    min-width: 0;
  }
  .project_toggle {
    display: flex;
    align-items: center;
    gap: var(--gap);
    padding: var(--gap);
    border: 0;
    background: none;
    color: var(--c-text-1);
    font: inherit;
    font-size: var(--f-size-m);
    cursor: pointer;
  }
  .project_list {
    box-sizing: border-box;
    width: 100%;
    padding: var(--gap) calc(var(--gap) * 5);
    color: var(--c-text-1);
    font-size: var(--f-size-m);
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
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
  .project_list a {
    color: inherit;
  }
</style>
