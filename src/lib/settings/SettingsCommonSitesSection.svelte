<script lang="ts">
    import { flip } from "svelte/animate";
    import { dndzone } from "svelte-dnd-action";
    import type { DndEvent } from "svelte-dnd-action";
    import type { WebSite } from "@/lib/DB/DB";
    import { t } from "@/lib/utils/i18n";
    import G from "@/lib/components/G.svelte";
    import T from "@/lib/components/T.svelte";
    import Button from "@/lib/components/Button.svelte";
    import Icon from "@/lib/components/Icon.svelte";
    import BkmkIcon from "@/lib/BkmkIcon.svelte";
    import Checkbox from "@/lib/components/Checkbox.svelte";
    import Divider from "../components/Divider.svelte";

    interface Props {
        commonSites: WebSite[];
        commonSitesLoading: boolean;
        commonSitesDragging: boolean;
        selectedSiteIds: Set<number>;
        onConsider: (e: CustomEvent<DndEvent<WebSite>>) => void;
        onFinalize: (e: CustomEvent<DndEvent<WebSite>>) => void;
        onAdd: () => void;
        onEdit: (site: WebSite) => void;
        onToggleSelected: (site: WebSite) => void;
    }

    let {
        commonSites,
        commonSitesLoading,
        commonSitesDragging,
        selectedSiteIds,
        onConsider,
        onFinalize,
        onAdd,
        onEdit,
        onToggleSelected,
    }: Props = $props();

    function isSiteSelected(site: WebSite) {
        return !!site.id && selectedSiteIds.has(site.id);
    }
</script>

<div class="setting_con">
    <div
        class="common_list"
        class:drag={commonSitesDragging}
        use:dndzone={{
            items: commonSites,
            flipDurationMs: 200,
            type: "settings-common",
            zoneTabIndex: -1,
            zoneItemTabIndex: -1,
            dropTargetStyle: {},
            dragDisabled: commonSitesLoading,
        }}
        onconsider={onConsider}
        onfinalize={onFinalize}
    >
        {#if commonSitesLoading}
            <div class="engine_loading">
                <G>
                    <Icon name="Loading" color="var(--c-text)" />
                </G>
            </div>
        {:else}
            {#each commonSites as site (site.id)}
                <div
                    class="common_row"
                    class:common_selected={isSiteSelected(site)}
                    animate:flip={{ duration: 200 }}
                >
                    <Button full align="c" onclick={() => onEdit(site)}>
                        <G full>
                            <G full align="c">
                                <BkmkIcon
                                    imgUrl={site.url}
                                    alt={site.title ?? site.url}
                                    size="m"
                                />
                                <T nowrap>{site.title ?? t("nt_unnamed")}</T>
                            </G>
                        </G>
                    </Button>
                    <Divider vertical />
                    <Checkbox
                        checked={isSiteSelected(site)}
                        disabled={commonSitesLoading}
                        onchange={() => onToggleSelected(site)}
                    />
                </div>
            {/each}
        {/if}
    </div>
    <G full>
        <Button full onclick={onAdd}>
            <G align="c">
                <Icon name="Plus" color="var(--c-text)" opacity={0.5} />
                <T type="s">{t("nt_add_pinned_title")}</T>
            </G>
        </Button>
    </G>
</div>

<style>
    .setting_con {
        width: 300px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
    }
    .engine_loading {
        display: flex;
        justify-content: center;
        padding: var(--gap);
    }
    .common_list {
        display: flex;
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
        padding: var(--gap);
        gap: var(--gap);
    }
    .common_list.drag {
        outline: var(--c-mask) 2px dashed;
    }
    .common_row {
        display: flex;
        align-items: center;
        width: 100%;
        box-sizing: border-box;
        border-radius: var(--r);
        background-color: var(--c-mask);
    }
    .common_selected {
        background-color: var(--c-mask1);
    }
</style>
