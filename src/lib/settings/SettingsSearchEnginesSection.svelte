<script lang="ts">
    import { flip } from "svelte/animate";
    import { dndzone } from "svelte-dnd-action";
    import type { DndEvent } from "svelte-dnd-action";
    import { slide } from "svelte/transition";
    import type { Engine } from "@/lib/DB/DB";
    import type { CategoryId } from "@/lib/settings/searchEngines";
    import { t } from "@/lib/utils/i18n";
    import G from "@/lib/components/G.svelte";
    import T from "@/lib/components/T.svelte";
    import Button from "@/lib/components/Button.svelte";
    import Icon from "@/lib/components/Icon.svelte";
    import EngineIcon from "@/lib/EngineIcon.svelte";
    import Checkbox from "../components/Checkbox.svelte";
    import Divider from "../components/Divider.svelte";

    type SearchEngineGroup = {
        id: string;
        name: string;
        items: Engine[];
    };

    interface Props {
        settingEnginesLoading: boolean;
        settingEnginesLoaded: boolean;
        settingEnginesSaving: boolean;
        expandedCategoryIds: Set<string>;
        groups: SearchEngineGroup[];
        selectedEngineIds: Set<number>;
        onOpenCategoryManager: () => void;
        onToggleCategoryExpanded: (categoryId: string) => void;
        onConsiderGroup: (
            categoryId: CategoryId,
            e: CustomEvent<DndEvent<Engine>>,
        ) => void;
        onFinalizeGroup: (
            categoryId: CategoryId,
            e: CustomEvent<DndEvent<Engine>>,
        ) => void;
        onEditEngine: (engine: Engine) => void;
        onAddEngineToCategory: (categoryId: string) => void;
        onToggleEngineSelected: (engine: Engine) => void;
    }

    let {
        settingEnginesLoading,
        settingEnginesLoaded,
        settingEnginesSaving,
        expandedCategoryIds,
        groups,
        selectedEngineIds,
        onOpenCategoryManager,
        onToggleCategoryExpanded,
        onConsiderGroup,
        onFinalizeGroup,
        onEditEngine,
        onAddEngineToCategory,
        onToggleEngineSelected,
    }: Props = $props();

    function isEngineSelected(engine: Engine) {
        return !!engine.id && selectedEngineIds.has(engine.id);
    }
</script>

<div class="setting_con">
    <div class="select_item">
        <Button full align="c" onclick={onOpenCategoryManager} fill r="r1">
            <G full align="c">
                <G vertical full>
                    <T>{t("nt_settings_search_categories_title")}</T>
                </G>
                <G>
                    <Icon
                        name="ArrowUpRight"
                        color="var(--c-text)"
                        opacity={0}
                    />
                </G>
            </G>
        </Button>
    </div>
    <div class="categories_list">
        {#if settingEnginesLoading && !settingEnginesLoaded}
            <div class="engine_loading">
                <G>
                    <Icon name="Loading" color="var(--c-text)" />
                </G>
            </div>
        {:else}
            {#each groups as group (group.id)}
                {@const isExpanded = expandedCategoryIds.has(group.id)}
                <div class="engine_group">
                    <Button
                        full
                        onclick={() => onToggleCategoryExpanded(group.id)}
                    >
                        <G full align="c">
                            <Icon
                                name={isExpanded
                                    ? "ChevronDown"
                                    : "ChevronRight"}
                                color="var(--c-text-1)"
                            />
                            <T type="m" color="var(--c-text)" nowrap
                                >{group.name}</T
                            >
                        </G>
                        <G align="c">
                            <T type="s" color="var(--c-text-2)" nowrap
                                >{group.items.length}</T
                            >
                        </G>
                    </Button>

                    {#if isExpanded}
                        <div
                            class="engine_list_wrapper"
                            class:engine_list_empty={!group.items.length}
                            transition:slide={{ duration: 200 }}
                        >
                            <div
                                class="engine_list"
                                use:dndzone={{
                                    items: group.items,
                                    flipDurationMs: 200,
                                    type: "settings-engines",
                                    zoneTabIndex: -1,
                                    zoneItemTabIndex: -1,
                                    dropTargetStyle: {},
                                    dragDisabled: settingEnginesSaving,
                                }}
                                onconsider={(e) => onConsiderGroup(group.id, e)}
                                onfinalize={(e) => onFinalizeGroup(group.id, e)}
                            >
                                {#each group.items as engine (engine.id)}
                                    <div
                                        class="engine_row"
                                        class:engine_selected={isEngineSelected(
                                            engine,
                                        )}
                                        class:disabled_engine={engine.enabled ===
                                            false}
                                        animate:flip={{ duration: 200 }}
                                    >
                                        <Button
                                            full
                                            onclick={() => onEditEngine(engine)}
                                            align="c"
                                        >
                                            <G full align="c">
                                                <EngineIcon
                                                    alt={engine.title ?? "?"}
                                                    engineUrl={engine.engineUrl}
                                                    src={engine.faviconUrl}
                                                />
                                                <T
                                                    nowrap
                                                    strike={engine.enabled ===
                                                        false}
                                                    color={engine.enabled
                                                        ? "var(--c-text)"
                                                        : "var(--c-text-1)"}
                                                    >{engine.title ??
                                                        t("nt_unnamed")}</T
                                                >
                                            </G>
                                        </Button>
                                        <Divider vertical />
                                            <Checkbox
                                                checked={isEngineSelected(
                                                    engine,
                                                )}
                                                disabled={settingEnginesSaving}
                                                onchange={() =>
                                                    onToggleEngineSelected(
                                                        engine,
                                                    )}
                                            />
                                    </div>
                                {/each}
                            </div>
                            <Button
                                onclick={() => onAddEngineToCategory(group.id)}
                            >
                                <G align="c">
                                    <Icon
                                        name="Plus"
                                        color="var(--c-text)"
                                        opacity={0.5}
                                    />
                                    <T type="s"
                                        >{t("nt_settings_search_add_engine")}</T
                                    >
                                </G>
                            </Button>
                        </div>
                    {/if}
                </div>
            {/each}
            <G full>
                <T type="s">{t("nt_settings_search_drag_reorder_or_move")}</T>
            </G>
        {/if}
    </div>
</div>

<style>
    .setting_con {
        width: 300px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        position: relative;
    }
    .select_item {
        display: flex;
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
        padding: var(--gap);
    }
    .categories_list {
        display: flex;
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
        padding: var(--gap);
        gap: calc(var(--gap) * 2);
    }
    .engine_loading {
        display: flex;
        justify-content: center;
        padding: var(--gap);
    }
    .engine_group {
        display: flex;
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
        gap: var(--gap);
    }
    .engine_list_wrapper {
        display: flex;
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
        gap: var(--gap);
        border: 1px solid var(--c-border);
        border-radius: var(--r1);
        padding: var(--gap);
    }
    .engine_list_wrapper.engine_list_empty {
        border: 1px dashed var(--c-border);
        min-height: 40px;
    }
    .engine_list {
        display: flex;
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
        gap: var(--gap);
        min-height: 40px;
    }
    .engine_row {
        display: flex;
        align-items: center;
        width: 100%;
        box-sizing: border-box;
        border-radius: var(--r);
        background-color: var(--c-mask);
    }
    .disabled_engine {
        filter: grayscale(1);
    }
    
</style>
