<script lang="ts">
    import { flip } from "svelte/animate";
    import { dndzone } from "svelte-dnd-action";
    import type { DndEvent } from "svelte-dnd-action";
    import type { PinnedOrderItem, WebSite, WebSiteFolder } from "@/lib/DB/DB";
    import { t } from "@/lib/utils/i18n";
    import G from "@/lib/components/G.svelte";
    import T from "@/lib/components/T.svelte";
    import Button from "@/lib/components/Button.svelte";
    import Icon from "@/lib/components/Icon.svelte";
    import BkmkIcon from "@/lib/BkmkIcon.svelte";
    import Checkbox from "@/lib/components/Checkbox.svelte";
    import Divider from "../components/Divider.svelte";

    type ListItem =
        | { id: string; kind: "website"; order: number; website: WebSite }
        | { id: string; kind: "folder"; order: number; folder: WebSiteFolder };

    interface Props {
        commonSites: WebSite[];
        folders: WebSiteFolder[];
        currentFolderId?: number;
        commonSitesLoading: boolean;
        commonSitesError: boolean;
        commonSitesDragging: boolean;
        selectedSiteIds: Set<number>;
        onDragging: (dragging: boolean) => void;
        onReorderRoot: (items: PinnedOrderItem[]) => void | Promise<void>;
        onReorderFolder: (items: WebSite[]) => void | Promise<void>;
        onAdd: () => void;
        onEdit: (site: WebSite) => void;
        onToggleSelected: (site: WebSite) => void;
        onOpenFolder: (folder: WebSiteFolder) => void;
        onReset: () => void | Promise<void>;
    }

    let {
        commonSites, folders, currentFolderId, commonSitesLoading,
        commonSitesError, commonSitesDragging, selectedSiteIds, onDragging,
        onReorderRoot, onReorderFolder, onAdd, onEdit, onToggleSelected,
        onOpenFolder, onReset,
    }: Props = $props();
    let listItems: ListItem[] = $state([]);
    const currentFolder = $derived(folders.find((folder) => folder.id === currentFolderId));

    $effect(() => {
        const sites = commonSites.filter((site) => currentFolderId == null
            ? site.folderId == null || !folders.some((folder) => folder.id === site.folderId)
            : site.folderId === currentFolderId);
        listItems = [
            ...sites.map((website, index) => ({ id: `website:${website.id ?? website.url}`, kind: "website" as const, order: website.order ?? index, website })),
            ...(currentFolderId == null ? folders.map((folder, index) => ({ id: `folder:${folder.id ?? folder.title}`, kind: "folder" as const, order: folder.order ?? sites.length + index, folder })) : []),
        ].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    });

    const isSiteSelected = (site: WebSite) => !!site.id && selectedSiteIds.has(site.id);
    function handleConsider(event: CustomEvent<DndEvent<ListItem>>) {
        onDragging(true);
        listItems = event.detail.items;
    }
    async function handleFinalize(event: CustomEvent<DndEvent<ListItem>>) {
        onDragging(false);
        listItems = event.detail.items;
        if (currentFolderId == null) {
            await onReorderRoot(listItems.flatMap((item) => {
                const id = item.kind === "website" ? item.website.id : item.folder.id;
                return id == null ? [] : [{ kind: item.kind, id }];
            }));
        } else {
            await onReorderFolder(listItems.flatMap((item) => item.kind === "website" ? [item.website] : []));
        }
    }
</script>

<div class="setting_con">
    <div class="common_list" class:drag={commonSitesDragging} use:dndzone={{ items: listItems, flipDurationMs: 200, type: "settings-common", zoneTabIndex: -1, zoneItemTabIndex: -1, dropTargetStyle: {}, dragDisabled: commonSitesLoading }} onconsider={handleConsider} onfinalize={handleFinalize}>
        {#if commonSitesLoading}
            <div class="settings_skeleton" aria-hidden="true">
                {#each Array.from({ length: 6 }) as _}
                    <div class="skeleton_row skeleton_shimmer"><div class="skeleton_icon"></div><div class="skeleton_text"></div></div>
                {/each}
            </div>
        {:else if commonSitesError}
            <div class="error_state" role="alert">
                <Icon name="Info" color="var(--c-text)" opacity={0.6} size={28} />
                <T align="c" bold>{t("nt_websites_load_failed")}</T>
                <T align="c" type="s">{t("nt_settings_common_load_failed_desc")}</T>
                <Button onclick={() => void onReset()} bg="var(--c-text)"><G align="c"><Icon name="RotateCcw" color="var(--c-bg)" size={16} /><T color="var(--c-bg)">{t("nt_confirm_reset_common_sites_title")}</T></G></Button>
            </div>
        {:else}
            {#each listItems as item (item.id)}
                <div class="common_row" class:common_selected={item.kind === "website" && isSiteSelected(item.website)} animate:flip={{ duration: 200 }}>
                    {#if item.kind === "folder"}
                        <Button full align="c" onclick={() => onOpenFolder(item.folder)}>
                            <G full align="c"><Icon name="Folder" color="var(--c-text)" /><T nowrap>{item.folder.title}</T><Icon name="ChevronRight" color="var(--c-text)" opacity={0.5} /></G>
                        </Button>
                    {:else}
                        <Button full align="c" onclick={() => onEdit(item.website)}><G full><G full align="c"><BkmkIcon imgUrl={item.website.url} alt={item.website.title ?? item.website.url} size="m" /><T nowrap>{item.website.title ?? t("nt_unnamed")}</T></G></G></Button>
                        <Divider vertical />
                        <Checkbox checked={isSiteSelected(item.website)} disabled={commonSitesLoading} onchange={() => onToggleSelected(item.website)} />
                    {/if}
                </div>
            {/each}
        {/if}
    </div>
    {#if !commonSitesLoading && !commonSitesError}
        <G full><Button full onclick={onAdd}><G align="c"><Icon name="Plus" color="var(--c-text)" opacity={0.5} /><T type="s">{t("nt_add_pinned_title")}</T></G></Button></G>
    {/if}
</div>

<style>
    .setting_con { width: 300px; display: flex; flex-direction: column; align-items: flex-start; }
    .settings_skeleton, .error_state { display: flex; flex-direction: column; width: 100%; box-sizing: border-box; gap: var(--gap); }
    .error_state { align-items: center; padding: calc(var(--gap) * 3) var(--gap); }
    .skeleton_row { display: flex; align-items: center; gap: var(--gap); height: 48px; padding: var(--gap); border-radius: var(--r); background: var(--c-mask); box-sizing: border-box; position: relative; overflow: hidden; }
    .skeleton_icon { width: 28px; height: 28px; border-radius: var(--r); background: var(--c-mask1); }
    .skeleton_text { width: 55%; height: 10px; border-radius: 999px; background: var(--c-mask1); }
    .skeleton_shimmer::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, var(--c-card), transparent); animation: settings-shimmer 1.25s ease-in-out infinite; }
    @keyframes settings-shimmer { to { transform: translateX(100%); } }
    @media (prefers-reduced-motion: reduce) { .skeleton_shimmer::after { animation: none; } }
    .common_list { display: flex; flex-direction: column; width: 100%; box-sizing: border-box; padding: var(--gap); gap: var(--gap); min-height: 44px; }
    .common_list.drag { outline: var(--c-mask) 2px dashed; }
    .common_row { display: flex; align-items: center; width: 100%; box-sizing: border-box; border-radius: var(--r); background-color: var(--c-mask); }
    .common_selected { background-color: var(--c-mask1); }
</style>
