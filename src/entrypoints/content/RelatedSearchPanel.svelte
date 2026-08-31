<script lang="ts">
  import { onMount, tick } from "svelte";
  import EngineIcon from "@/lib/EngineIcon.svelte";
  import Button from "@/lib/components/Button.svelte";
  import G from "@/lib/components/G.svelte";
  import Icon from "@/lib/components/Icon.svelte";
  import T from "@/lib/components/T.svelte";
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
  };

  export type RelatedSearchPayload = {
    matchedEngine: RelatedSearchEngine;
    engines: RelatedSearchEngine[];
    theme: "default" | "ocean" | "sunset" | "purple" | "yellow";
    language: "auto" | "zh_CN" | "zh_TW" | "en";
    texts: {
      placeholder: string;
      searchShortcutTip: string;
      switchShortcutTip: string;
    };
  };

  interface Props {
    data: RelatedSearchPayload;
    initialKeyword: string;
    placeholder: string;
    searchShortcutTip: string;
    switchShortcutTip: string;
    onClose: () => void;
  }

  let {
    data,
    initialKeyword,
    placeholder,
    searchShortcutTip,
    switchShortcutTip,
    onClose,
  }: Props = $props();

  let keyword = $state("");
  let selectedEngineUrl = $state("");
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
    selectedEngineUrl = resolveEngineByDomain(
      data.engines,
      location.hostname,
      data.matchedEngine,
    ).engineUrl;
    void restorePosition();
    void syncInputWidth();
  });

  async function syncInputWidth() {
    await tick();
    if (!measureEl) return;
    measureEl.textContent = keyword || placeholder || "";
    inputWidth = Math.max(62, Math.ceil(measureEl.scrollWidth) + 2);
  }

  function selectEngine(engine: RelatedSearchEngine) {
    selectedEngineUrl = engine.engineUrl;
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
    const index = data.engines.findIndex(
      (item) => item.engineUrl === engine.engineUrl,
    );
    const nextIndex =
      event.key === "ArrowLeft"
        ? (index - 1 + data.engines.length) % data.engines.length
        : (index + 1) % data.engines.length;
    const nextEngine = data.engines[nextIndex];
    if (!nextEngine) return;
    selectEngine(nextEngine);
    getEngineButton(nextEngine.engineUrl)?.focus();
  }

  function getSelectedEngine() {
    return (
      data.engines.find((engine) => engine.engineUrl === selectedEngineUrl) ??
      resolveEngineByDomain(data.engines, location.hostname, data.matchedEngine)
    );
  }

  function getSelectedEngineButton() {
    return selectedEngineUrl ? getEngineButton(selectedEngineUrl) : null;
  }

  function getEngineButton(engineUrl: string) {
    if (!enginesEl) return null;
    return enginesEl.querySelector<HTMLAnchorElement>(
      `.engine[data-engine-url="${CSS.escape(engineUrl)}"]`,
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
<<<<<<< HEAD
    const rect = panelEl.getBoundingClientRect();
    void getExtensionStorage().set({
      [getPositionStorageKey()]: { left: rect.left, top: rect.top },
=======
    const rect = host.getBoundingClientRect();
    void saveRelatedSearchPosition(location.hostname, {
      left: rect.left,
      top: rect.top,
>>>>>>> 70dd283 (优化注入的时候数据存储key太散)
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

<div class="search" bind:this={panelEl}>
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
            {#each data.engines as engine (engine.engineUrl)}
              <a
                class="engine"
                class:selected={engine.engineUrl === selectedEngineUrl}
                data-engine-url={engine.engineUrl}
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

{#snippet tip(tip: string)}
  <div class="tip" transition:slide={{ duration: 200 }}>
    <T type="s" color="var(--c-text-1)" nowrap>{tip}</T>
  </div>
{/snippet}

<style>
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
    gap: var(--gap);
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
    caret-color: var(--c-green);
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
