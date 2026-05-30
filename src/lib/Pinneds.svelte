<script lang="ts">
  import BkmkIcon from "./BkmkIcon.svelte";
  import T from "./components/T.svelte";
  import G from "./components/G.svelte";
  import { flip } from "svelte/animate";
  import { dndzone } from "svelte-dnd-action";
  import type { DndEvent } from "svelte-dnd-action";
  import {
    addWebSite,
    updateWebSite,
    deleteWebSite,
    updateWebSitesOrder,
  } from "@/lib/DB/DB";
  import type { WebSite } from "@/lib/DB/DB";
  import type { FrequentSite } from "@/lib/browser/history";
  import { addToPinneds } from "@/lib/utils/pinneds";
  import Button from "./components/Button.svelte";
  import AddPinned from "./AddPinned.svelte";
  import LinkContextMenu from "./LinkContextMenu.svelte";
  import NoData from "./NoData.svelte";
  import { t } from "@/lib/utils/i18n";
  import Icon from "./components/Icon.svelte";
  import Popup from "./components/Popup.svelte";
  import Divider from "./components/Divider.svelte";

  interface Props {
    allPinneds: WebSite[] | [];
    frequentSites?: FrequentSite[];
    newTabOpen?: boolean;
    list?: boolean;
    showAdd: boolean;
    onopenAdd: () => void;
    oncloseAdd: () => void;
    onUpdate: (items?: WebSite[]) => void;
  }

  let {
    allPinneds,
    frequentSites = [],
    newTabOpen = false,
    list = false,
    showAdd,
    onopenAdd,
    oncloseAdd,
    onUpdate,
  }: Props = $props();
  let isdarging = $state(false);
  let currentPinned: WebSite | undefined = $state();
  let currentFrequent: FrequentSite | undefined = $state();
  let openByEdit = $state(false);

  let menuX = $state(0);
  let menuY = $state(0);

  let showPinnedMenu = $state(false);
  let showFrequentMenu = $state(false);
  let showFrequentInfo = $state(false);
  let pageEl: HTMLElement | undefined = $state();
  let frequentTitleStuck = $state(false);

  const fixedDomains = $derived.by(() => {
    return new Set(
      allPinneds.map((pinned) => pinned.domain.replace(/^www\./, "")),
    );
  });
  const filteredFrequentSites = $derived.by(() => {
    return frequentSites.filter((site) => !fixedDomains.has(site.domain));
  });

  function showContextMenu(e: MouseEvent, pinned: WebSite) {
    e.preventDefault();
    e.stopPropagation();

    currentPinned = pinned;
    currentFrequent = undefined;
    menuX = e.clientX;
    menuY = e.clientY;
    showFrequentMenu = false;
    showPinnedMenu = true;
  }

  function showFrequentContextMenu(e: MouseEvent, site: FrequentSite) {
    e.preventDefault();
    e.stopPropagation();

    currentPinned = undefined;
    currentFrequent = site;
    menuX = e.clientX;
    menuY = e.clientY;
    showPinnedMenu = false;
    showFrequentMenu = true;
  }

  function draggedel(el: HTMLElement | undefined) {
    if (!el) return;
    el.style.backgroundColor = "var(--c-bg1)";
  }

  function handleConsider(e: CustomEvent<DndEvent<WebSite>>) {
    isdarging = true;
    onUpdate(e.detail.items);
  }

  async function handleFinalize(e: CustomEvent<DndEvent<WebSite>>) {
    isdarging = false;
    const items = e.detail.items;
    onUpdate(items);
    const withIds = items.filter((i): i is WebSite & { id: number } => !!i.id);
    if (withIds.length > 0) {
      await updateWebSitesOrder(withIds);
    }
  }

  async function clickSaveWebSite(newWebSite: WebSite) {
    if (openByEdit && currentPinned?.id) {
      await updateWebSite({ ...newWebSite, id: currentPinned.id });
    } else {
      await addWebSite(newWebSite);
    }
    onUpdate();
  }

  function clickEditWebSite() {
    openByEdit = true;
    showPinnedMenu = false;
    onopenAdd();
  }

  function clickCloseAdd() {
    openByEdit = false;
    currentPinned = undefined;
    oncloseAdd();
  }
  async function clickDeleteWebSite() {
    if (currentPinned?.id) {
      await deleteWebSite(currentPinned.id);
    }
    onUpdate();
    showPinnedMenu = false;
  }

  async function clickAddFrequentToPinned() {
    showFrequentMenu = false;
    if (!currentFrequent) return;
    await addToPinneds(currentFrequent.url, currentFrequent.title);
    currentFrequent = undefined;
    onUpdate();
  }

  function trackStickyFrequentTitle(node: HTMLElement) {
    const scrollContainer = node.closest(".tabs_contents");
    const root = scrollContainer instanceof HTMLElement ? scrollContainer : window;
    let frame = 0;

    const updateStuckState = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const sentinel = node.previousElementSibling;
        if (!(sentinel instanceof HTMLElement)) {
          frequentTitleStuck = false;
          return;
        }
        const stickyTop = Number.parseFloat(getComputedStyle(node).top) || 0;
        const rootTop =
          scrollContainer instanceof HTMLElement
            ? scrollContainer.getBoundingClientRect().top
            : 0;
        const scrollTop =
          scrollContainer instanceof HTMLElement
            ? scrollContainer.scrollTop
            : window.scrollY;
        const titleNormalTop =
          sentinel.getBoundingClientRect().bottom - rootTop + scrollTop;
        frequentTitleStuck = scrollTop > titleNormalTop - stickyTop + 0.5;
      });
    };

    root.addEventListener("scroll", updateStuckState, { passive: true });
    window.addEventListener("resize", updateStuckState);
    updateStuckState();

    return {
      destroy() {
        cancelAnimationFrame(frame);
        root.removeEventListener("scroll", updateStuckState);
        window.removeEventListener("resize", updateStuckState);
        frequentTitleStuck = false;
      },
    };
  }
</script>

<div class="page" bind:this={pageEl}>
    {#if allPinneds.length}
      <section class="section">
        <div
          class="content grid {isdarging ? 'drag' : ''}"
          use:dndzone={{
            items: allPinneds,
            flipDurationMs: 200,
            type: "pinneds",
            dropTargetStyle: {},
            zoneTabIndex: -1,
            zoneItemTabIndex: -1,
            transformDraggedElement: (e) => draggedel(e),
          }}
          onconsider={handleConsider}
          onfinalize={handleFinalize}
        >
          {#each allPinneds as pinned (pinned.id)}
            <div class="item" animate:flip={{ duration: 200 }}>
              <a
                href={pinned.url}
                target={newTabOpen ? "_blank" : "_self"}
                rel={newTabOpen ? "noreferrer" : undefined}
                class:ctx={showPinnedMenu && currentPinned?.id === pinned.id}
                oncontextmenu={(e) => showContextMenu(e, pinned)}
              >
                <BkmkIcon
                  imgUrl={pinned.url}
                  alt={pinned.title ?? ""}
                  size="l"
                />
              </a>
              <T nowrap align="c" type="s">{pinned.title}</T>
            </div>
          {/each}
        </div>
      </section>
        {:else}
    <NoData
      iconName="Sprout"
      title={t("nt_no_pinned")}
      text={t("nt_no_pinned_desc")}
    />
    {/if}

    {#if filteredFrequentSites.length}
      <section class="section">
        <G full>
          <Divider />
        </G>
        <div class="frequent_section_body">
          <div class="frequent_title_sentinel"></div>
          <div
            class="frequent_section_title"
            class:frequent_section_title_stuck={frequentTitleStuck}
            use:trackStickyFrequentTitle
          >
            <G full>
              <Icon
                name="Sparkles"
                color="var(--c-text)"
                opacity={0.6}
                size={16}
              />
              <T type="m" color="var(--c-text-1)">{t("nt_frequent_section")}</T>
            </G>
            <Button
              onclick={() => (showFrequentInfo = true)}
              title={t("nt_frequent_info_title")}
            >
              <G>
                <Icon
                  name="Info"
                  color="var(--c-text)"
                  opacity={0.6}
                  size={16}
                />
              </G>
            </Button>
          </div>
          <div class="content {list ? 'list' : 'grid'}">
            {#each filteredFrequentSites as site (site.domain)}
              <div class="item" class:list_item={list}>
                <a
                  href={site.url}
                  target={newTabOpen ? "_blank" : "_self"}
                  rel={newTabOpen ? "noreferrer" : undefined}
                  class:list_link={list}
                  class:ctx={showFrequentMenu &&
                    currentFrequent?.domain === site.domain}
                  oncontextmenu={(e) => showFrequentContextMenu(e, site)}
                >
                  {#if list}
                    <G>
                      <BkmkIcon imgUrl={site.url} alt={site.title} size="s" />
                    </G>
                    <G full align="c">
                      <T nowrap type="m" bold>{site.title}</T>
                    </G>
                    <G align="c">
                      <T type="s" nowrap>{site.visitCount}</T>
                      <Icon
                        name="Eye"
                        color="var(--c-text)"
                        opacity={0.6}
                        size={16}
                      />
                    </G>
                  {:else}
                    <BkmkIcon imgUrl={site.url} alt={site.title} size="l" />
                  {/if}
                </a>
                {#if !list}
                  <T nowrap align="c" type="s">{site.title}</T>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </section>
    {/if}
</div>

{#if showAdd}
  <AddPinned
    isEdit={openByEdit}
    urlValue={openByEdit ? currentPinned?.url : undefined}
    titleValue={openByEdit ? currentPinned?.title : undefined}
    onSave={clickSaveWebSite}
    onDelete={clickDeleteWebSite}
    onclickClose={clickCloseAdd}
  />
{/if}

{#if showPinnedMenu && currentPinned}
  <LinkContextMenu
    x={menuX}
    y={menuY}
    url={currentPinned.url}
    onClose={() => (showPinnedMenu = false)}
  >
    <Button full onclick={clickEditWebSite}>
      <G>
        <T>{t("nt_edit")}</T>
      </G>
    </Button>
    <Button full onclick={clickDeleteWebSite}>
      <G>
        <T>{t("nt_delete")}</T>
      </G>
    </Button>
  </LinkContextMenu>
{/if}

{#if showFrequentMenu && currentFrequent}
  <LinkContextMenu
    x={menuX}
    y={menuY}
    url={currentFrequent.url}
    onClose={() => (showFrequentMenu = false)}
  >
    <Button full onclick={clickAddFrequentToPinned}>
      <G>
        <T>{t("nt_add_to_pinned")}</T>
      </G>
    </Button>
  </LinkContextMenu>
{/if}

{#if showFrequentInfo}
  <Popup
    type="s"
    title={t("nt_frequent_info_title")}
    onclickClose={() => (showFrequentInfo = false)}
  >
    <div class="info_body">
      <T type="s" color="var(--c-text)">
        {t("nt_frequent_info_desc")}
      </T>
    </div>
  </Popup>
{/if}

<style>
  .page {
    display: flex;
    flex-direction: column;
    width: 100%;
    align-items: center;
    gap: calc(var(--gap) * 2);
  }
  .section {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
  }
  .item {
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    border-radius: var(--r);
    cursor: default !important;
    gap: var(--gap);
    padding: var(--gap);
  }
  .content {
    gap: var(--gap);
    padding: var(--gap);
    width: 100%;
    box-sizing: border-box;
    border-radius: var(--r1);
  }
  .frequent_section_body {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
  }
  .frequent_title_sentinel {
    width: 100%;
    height: 1px;
    margin-bottom: -1px;
    pointer-events: none;
  }
  .frequent_section_title {
    position: sticky;
    top: calc(var(--gap) * -1);
    z-index: 1;
    display: flex;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
    border-radius: var(--r);
    transition: background-color 0.16s ease;
  }
  .frequent_section_title_stuck {
    background-color: var(--c-bg1);
  }
  .drag {
    border-style: dashed;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
  .list {
    display: flex;
    flex-direction: column;
  }
  .list_item {
    padding: 0;
    width: 100%;
  }
  .list_link {
    width: 100%;
    flex-direction: row;
    align-items: center;
    border-radius: var(--r);
  }
  .info_body {
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
    white-space: pre-line;
  }

  a {
    text-decoration: none;
    cursor: default;
    margin: 0;
    border-radius: var(--r1);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--gap);
    box-sizing: border-box;
  }
   a:hover {
    background-color: var(--c-mask);
  }
  a:focus-visible {
    outline: var(--c-text) 2px solid;
  }

  a:active {
    background-color: var(--c-mask1);
  }

  a:focus {
    outline: 2px var(--c-text) solid;
  }
  a.ctx {
    outline: 2px var(--c-text) solid;
  }
</style>
