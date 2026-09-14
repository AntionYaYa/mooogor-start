<script lang="ts">
  import { onMount, tick } from "svelte";
  import { browser } from "wxt/browser";
  import { setEngineEnabled } from "@/lib/DB/engineCommands";
  import { subscribeEngineConfigChanges } from "@/lib/search/engineConfigChanges";
  import EngineIcon from "@/lib/EngineIcon.svelte";
  import Button from "@/lib/components/Button.svelte";
  import G from "@/lib/components/G.svelte";
  import Icon from "@/lib/components/Icon.svelte";
  import T from "@/lib/components/T.svelte";
  import Popup from "@/lib/components/Popup.svelte";
  import Switch from "@/lib/components/Switch.svelte";
  import { resolveEngineByDomain } from "./relatedSearchEngineMatch";
  import {
    readRelatedSearchPosition,
    saveRelatedSearchPosition,
  } from "@/lib/search/relatedSearchStorage";
  import { fly, slide } from "svelte/transition";

  export type RelatedSearchEngine = {
    id?: number;
    title?: string;
    engineUrl: string;
    faviconUrl: string;
    iconUrl?: string;
    category?: string;
    order?: number;
    enabled?: boolean;
  };

  export type RelatedSearchPayload = {
    matchedEngine: RelatedSearchEngine;
    engines: RelatedSearchEngine[];
    categoryName: string;
    theme: "default" | "ocean" | "sunset" | "purple" | "yellow";
    language: "auto" | "zh_CN" | "zh_TW" | "en";
    texts: {
      placeholder: string;
      searchShortcutTip: string;
      switchShortcutTip: string;
      saveFailed: string;
    };
  };

  interface Props {
    data: RelatedSearchPayload;
    initialKeyword: string;
    placeholder: string;
    searchShortcutTip: string;
    switchShortcutTip: string;
    onClose: () => void;
    portalTarget: ShadowRoot;
  }

  let {
    data,
    initialKeyword,
    placeholder,
    searchShortcutTip,
    switchShortcutTip,
    onClose,
    portalTarget,
  }: Props = $props();

  let keyword = $state("");
  let engines = $state<RelatedSearchEngine[]>([]);
  let showEngineDialog = $state(false);
  let engineSaving = $state(false);
  let engineRefreshPending = false;
  let engineRequestId = 0;
  let categoryName = $state("");
  let saveError = $state("");
  const enabledEngines = $derived(engines.filter((engine) => engine.enabled !== false));
  let selectedEngineId = $state<number | undefined>();
  let inputFocused = $state(false);
  let engineFocused = $state(false);
  let isComposing = $state(false);
  let inputWidth = $state(62);
  let inputEl: HTMLInputElement | undefined = $state();
  let measureEl: HTMLSpanElement | undefined = $state();
  let enginesEl: HTMLDivElement | undefined = $state();
  let panelEl: HTMLDivElement;

  const active = $derived(inputFocused || engineFocused || !!keyword.trim());
  const hasKeyword = $derived(!!keyword.trim());
  const showSearchShortcutTip = $derived(inputFocused && hasKeyword);
  const showSwitchShortcutTip = $derived(engineFocused);

  onMount(() => {
    keyword = initialKeyword;
    engines = [...data.engines];
    categoryName = data.categoryName;
    selectedEngineId = getSelectedEngine()?.id;
    void restorePosition();
    void syncInputWidth();
    const unsubscribe = subscribeEngineConfigChanges(() => void refreshEngines());
    void refreshEngines();
    return () => {
      unsubscribe();
      ++engineRequestId;
    };
  });

  async function refreshEngines() {
    if (engineSaving) {
      engineRefreshPending = true;
      return;
    }
    engineRefreshPending = false;
    const requestId = ++engineRequestId;
    try {
      const next: RelatedSearchPayload | null = await browser.runtime.sendMessage({
        type: "getRelatedSearchEngines",
        payload: { url: location.href },
      });
      if (requestId !== engineRequestId) return;
      if (!next) {
        onClose();
        return;
      }
      engines = next.engines;
      categoryName = next.categoryName;
      selectedEngineId = getSelectedEngine()?.id;
      saveError = "";
    } catch (error) {
      if (requestId !== engineRequestId) return;
      console.error("Failed to read related search engines", error);
      saveError = data.texts.saveFailed;
    }
  }

  async function toggleEngine(engine: RelatedSearchEngine) {
    if (engineSaving || engine.id === undefined) return;
    const enabled = engine.enabled === false;
    engineSaving = true;
    ++engineRequestId;
    saveError = "";
    try {
      await setEngineEnabled(engine.id, enabled);
      engineRefreshPending = true;
    } catch (error) {
      console.error("Failed to update related search engine", error);
      saveError = data.texts.saveFailed;
    } finally {
      engineSaving = false;
      if (engineRefreshPending) await refreshEngines();
    }
  }

  async function syncInputWidth() {
    await tick();
    if (!measureEl) return;
    measureEl.textContent = keyword || placeholder || "";
    inputWidth = Math.max(62, Math.ceil(measureEl.scrollWidth) + 2);
  }

  function selectEngine(engine: RelatedSearchEngine) {
    selectedEngineId = engine.id;
  }

  function searchWithEngine(engine: RelatedSearchEngine) {
    const value = keyword.trim();
    if (!value) {
      inputEl?.focus();
      return;
    }
    selectEngine(engine);
    location.href = engine.engineUrl.replace("%s", encodeURIComponent(value));
  }

  function getEngineSearchUrl(engine: RelatedSearchEngine) {
    return engine.engineUrl.replace("%s", encodeURIComponent(keyword.trim()));
  }

  function clickEngine(event: MouseEvent, engine: RelatedSearchEngine) {
    selectEngine(engine);
    if (keyword.trim()) return;
    event.preventDefault();
    inputEl?.focus();
  }

  function keyInput(event: KeyboardEvent) {
    if (isComposing || event.isComposing) return;
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    const engine = getSelectedEngine();
    if (!engine) return;
    if (!event.shiftKey) {
      searchWithEngine(engine);
      return;
    }
    getSelectedEngineButton()?.focus();
  }

  function keyEngine(event: KeyboardEvent, engine: RelatedSearchEngine) {
    if (event.key === "Enter") {
      event.stopPropagation();
      return;
    }
    if (event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      searchWithEngine(engine);
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      event.stopPropagation();
      inputEl?.focus();
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    event.stopPropagation();
    const index = enabledEngines.findIndex(
      (item) => item.id === engine.id,
    );
    const nextIndex =
      event.key === "ArrowLeft"
        ? (index - 1 + enabledEngines.length) % enabledEngines.length
        : (index + 1) % enabledEngines.length;
    const nextEngine = enabledEngines[nextIndex];
    if (!nextEngine) return;
    selectEngine(nextEngine);
    getEngineButton(nextEngine.id)?.focus();
  }

  function getSelectedEngine() {
    if (!enabledEngines.length) return undefined;
    return (
      enabledEngines.find((engine) => engine.id === selectedEngineId) ??
      resolveEngineByDomain(enabledEngines, location.hostname, enabledEngines[0])
    );
  }

  function getSelectedEngineButton() {
    return selectedEngineId ? getEngineButton(selectedEngineId) : null;
  }

  function getEngineButton(engineId: number | undefined) {
    if (!enginesEl) return null;
    return enginesEl.querySelector<HTMLAnchorElement>(
      `.engine[data-engine-id="${engineId}"]`,
    );
  }

  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  function pointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    const rect = panelEl.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    panelEl.style.left = `${rect.left}px`;
    panelEl.style.top = `${rect.top}px`;
    panelEl.style.right = "auto";
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent) {
    const target = event.currentTarget as HTMLElement;
    if (!target.hasPointerCapture(event.pointerId)) return;
    const rect = panelEl.getBoundingClientRect();
    const nextLeft = clamp(
      startLeft + event.clientX - startX,
      8,
      window.innerWidth - rect.width - 8,
    );
    const nextTop = clamp(
      startTop + event.clientY - startY,
      8,
      window.innerHeight - rect.height - 8,
    );
    panelEl.style.left = `${nextLeft}px`;
    panelEl.style.top = `${nextTop}px`;
  }

  function pointerUp(event: PointerEvent) {
    const target = event.currentTarget as HTMLElement;
    if (!target.hasPointerCapture(event.pointerId)) return;
    target.releasePointerCapture(event.pointerId);
    const rect = panelEl.getBoundingClientRect();
    void saveRelatedSearchPosition(location.hostname, {
      left: rect.left,
      top: rect.top,
    });
  }

  async function restorePosition() {
    const saved = readPanelPosition(
      await readRelatedSearchPosition(location.hostname),
    );
    if (!saved) return;
    panelEl.style.left = `${saved.left}px`;
    panelEl.style.top = `${saved.top}px`;
    panelEl.style.right = "auto";
  }

  function readPanelPosition(
    value: unknown,
  ): { left: number; top: number } | null {
    if (!value || typeof value !== "object") {
      return null;
    }
    const parsed = value as { left?: unknown; top?: unknown };
    if (typeof parsed.left !== "number" || typeof parsed.top !== "number") {
      return null;
    }
    return {
      left: clamp(parsed.left, 8, window.innerWidth - 64),
      top: clamp(parsed.top, 8, window.innerHeight - 64),
    };
  }

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }
</script>

<div class="search" bind:this={panelEl} style:visibility={showEngineDialog ? "hidden" : "visible"}>
  <div class="close">
    <Button onclick={onClose}>
      <G>
        <Icon name="X" color="var(--c-text)" opacity={0.6} size={12} />
      </G>
    </Button>
  </div>
  <div class="bg search_g">
    <div class="search_box">
      <button
        class="drag"
        type="button"
        tabindex="-1"
        aria-label="Drag"
        onpointerdown={pointerDown}
        onpointermove={pointerMove}
        onpointerup={pointerUp}
        onpointercancel={pointerUp}
      >
        <G>
          <Icon
            name="GripHorizontal"
            color="var(--c-text)"
            size={18}
            opacity={0.4}
          />
        </G>
      </button>
      <div class="input_group_border">
        <div class="input_group">
          <div class="input_box">
            <span bind:this={measureEl} class="measure"
              >{keyword || placeholder}</span
            >
            <input
              bind:this={inputEl}
              bind:value={keyword}
              class="input"
              type="search"
              {placeholder}
              style:width={`${inputWidth}px`}
              oncompositionstart={() => (isComposing = true)}
              oncompositionend={() => {
                isComposing = false;
                void syncInputWidth();
              }}
              oninput={() => void syncInputWidth()}
              onfocus={() => (inputFocused = true)}
              onblur={() => (inputFocused = false)}
              onkeydown={keyInput}
            />
          </div>
          <div class="engines" bind:this={enginesEl}>
            {#each enabledEngines as engine (engine.id)}
              <a
                class="engine"
                class:selected={engine.id === selectedEngineId}
                data-engine-id={engine.id}
                href={getEngineSearchUrl(engine)}
                title={engine.title ?? ""}
                onfocus={() => {
                  engineFocused = true;
                  selectEngine(engine);
                }}
                onblur={() => (engineFocused = false)}
                onkeydown={(event) => keyEngine(event, engine)}
                onclick={(event) => clickEngine(event, engine)}
              >
                <EngineIcon
                  alt={engine.title ?? "Search"}
                  engineUrl={engine.engineUrl}
                  src={engine.iconUrl}
                />
              </a>
            {/each}
          </div>
          <Button onclick={() => { saveError = ""; showEngineDialog = true; }}>
            <G><Icon name="Plus" color="var(--c-text)" opacity={0.6} /></G>
          </Button>
        </div>
      </div>
    </div>
    {#if showSearchShortcutTip}
      {@render tip(searchShortcutTip)}
    {/if}
    {#if showSwitchShortcutTip}
      {@render tip(switchShortcutTip)}
    {/if}
  </div>
</div>

{#if showEngineDialog}
  <Popup type="s" title={categoryName} {portalTarget} zIndex={2147483647} onclickClose={() => {
    if (!engineSaving) showEngineDialog = false;
  }}>
    <G vertical full gap>
      <div class="engine_list">
        {#each engines as engine (engine.id)}
          <div class="engine_row">
            <EngineIcon alt={engine.title ?? ""} engineUrl={engine.engineUrl} src={engine.iconUrl} />
            <div class="engine_name"><T nowrap>{engine.title ?? ""}</T></div>
            <Switch turnOn={engine.enabled !== false} label={engine.title}
              disabled={engineSaving}
              onclick={() => void toggleEngine(engine)} />
          </div>
        {/each}
      </div>
      {#if saveError}<T>{saveError}</T>{/if}
    </G>
  </Popup>
{/if}

{#snippet tip(tip: string)}
  <div class="tip" transition:slide={{ duration: 200 }}>
    <T type="s" color="var(--c-text-1)" nowrap>{tip}</T>
  </div>
{/snippet}

<style>
  .engine_list {
    display: flex;
    flex-direction: column;
    gap: var(--gap);
    width: 100%;
    max-height: min(420px, calc(100vh - 220px));
    overflow-y: auto;
    box-sizing: border-box;
    padding: var(--gap);
    border: var(--border);
    border-radius: var(--r1);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .engine_row {
    display: flex;
    align-items: center;
    gap: var(--gap);
    min-height: 44px;
    padding: var(--gap);
    border-radius: var(--r);
    background-color: var(--c-mask);
    box-sizing: border-box;
  }
  .engine_name { flex: 1; min-width: 0; }
  .search {
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    align-items: center;
    color: var(--c-text);
    border: 0;
    background: transparent;
    padding: 0;
    margin: 0;
    border-radius: var(--r2);
    color-scheme: light dark;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .tip {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--gap);
    width: 0;
    min-width: 100%;
    overflow: hidden;
    box-sizing: border-box;
  }
  .search:hover .close {
    opacity: 1;
    pointer-events: auto;
    transform: scale(1);
    border-radius: var(--r-100);
    background-color: var(--c-bg1);
    border:1px solid var(--c-border);
  }

  .close {
    position: absolute;
    top: -10px;
    left: -10px;
    z-index: 2;
    font-size: 15px;
    line-height: 1;
    opacity: 0;
    pointer-events: none;
    transform: scale(0.8);
    
    transition:
      opacity 0.16s ease,
      transform 0.16s ease;
  }

  .search_g {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: max-content;
    max-width: calc(100vw - 20px);
    box-sizing: border-box;
    box-shadow: var(--shadow);
    border-radius: var(--r2);
    background-color: var(--c-bg);
    
  }
  .search_box {
    display: flex;
    align-items: center;
    width: max-content;
    box-sizing: border-box;
    border-radius: calc(var(--r1) + 3px);
    padding: calc(var(--gap) / 2);
    background-color: var(--c-bg1);
    border:1px solid var(--c-border);
  }
  .drag {
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: stretch;
    border: 0;
    border-radius: var(--r1);
    background: var(--c-bg1);
    cursor: grab;
    padding: 0;
    user-select: none;
  }

  .drag:active {
    cursor: grabbing;
  }
  .input_group_border {
    padding: 2px;
    box-sizing: border-box;
    border-radius: var(--r1);
    background: var(--c-border);
  }

  .input_group_border:has(input:focus) {
    background: linear-gradient(0deg, var(--c-main), var(--c-main-1));
  }

  .input_group {
    display: flex;
    align-items: center;
    gap: 0;
    border-radius: calc(var(--r1) - 2px);
    background-color: var(--c-bg1);
    box-sizing: border-box;
  }

  .input_box {
    position: relative;
    display: flex;
    align-items: center;
    max-width: min(320px, calc(100vw - 170px));
  }

  .measure {
    position: absolute;
    visibility: hidden;
    white-space: pre;
    font-size: var(--f-size-m);
    font-family: inherit;
    padding: var(--gap) calc(var(--gap) * 2);
  }

  .input {
    width: 62px;
    min-width: 62px;
    max-width: min(320px, calc(100vw - 170px));
    box-sizing: border-box;
    border: 0;
    border-radius: var(--r);
    background: transparent;
    color: var(--c-text);
    outline: none;
    padding: var(--gap) calc(var(--gap) * 2);
    font: inherit;
    font-size: var(--f-size-m);
    height: 40px;
    caret-color: var(--c-main);
    transition: width 0.1s ease-out;
  }

  .input::-webkit-search-cancel-button {
    -webkit-appearance: none;
    appearance: none;
    display: none;
  }

  .input::-moz-search-clear {
    display: none;
  }

  .input::placeholder {
    color: var(--c-text-2);
  }

  .engines {
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: var(--gap);
    padding: var(--gap);
    border-radius: var(--r);
    min-height: 40px;
    min-width: max-content;
    width: max-content;
    box-sizing: border-box;
    position: relative;
    flex-wrap: nowrap;
  }

  .engine {
    display: flex;
    border-radius: calc(var(--r) / 2 + 2px);
    overflow: hidden;
    cursor: default !important;
    min-width: 30px;
    flex: 0 0 auto;
    text-decoration: none;
  }

  .engine:active {
    background-color: var(--c-mask);
  }

  .engine.selected {
    outline: 2px var(--c-text-2) solid;
  }

  .engine:focus {
    outline: 2px var(--c-main) solid;
  }
</style>
