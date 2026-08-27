<script lang="ts">
  import { onMount, tick } from "svelte";
  import { slide } from "svelte/transition";
  import {
    createBookmark,
    getBookmarks,
    updateBookmark,
    type BookmarkNode,
  } from "@/lib/browser/bookmarks";
  import Button from "./components/Button.svelte";
  import G from "./components/G.svelte";
  import Popup from "./components/Popup.svelte";
  import T from "./components/T.svelte";
  import Icon from "./components/Icon.svelte";
  import { t } from "@/lib/utils/i18n";

  interface FolderTreeNode extends BookmarkNode {
    children?: FolderTreeNode[];
  }

  interface Props {
    bookmark: BookmarkNode;
    folders: FolderTreeNode[];
    onSave: (parentId: string) => void | Promise<void>;
    onclickClose: () => void;
  }

  let { bookmark, folders, onSave, onclickClose }: Props = $props();

  let folderTree = $state<FolderTreeNode[]>([]);
  let selectedFolderId = $state("");
  let expandedFolderIds = $state<Set<string>>(new Set());
  let creatingParentId = $state<string | null>(null);
  let creatingFolderTitle = $state("");
  let editingFolderId = $state<string | null>(null);
  let editingFolderTitle = $state("");
  let working = $state(false);
  let createInputEl: HTMLInputElement | null = $state(null);
  let editInputEl: HTMLInputElement | null = $state(null);

  const excludedFolderId = $derived(bookmark.url ? undefined : bookmark.id);

  function findPathToFolder(
    nodes: FolderTreeNode[],
    targetId: string,
    path: string[] = [],
  ): string[] | null {
    for (const node of nodes) {
      const nextPath = [...path, node.id];
      if (node.id === targetId) return nextPath;
      const found = findPathToFolder(node.children ?? [], targetId, nextPath);
      if (found) return found;
    }
    return null;
  }

  function findFolderById(
    nodes: FolderTreeNode[],
    targetId: string,
  ): FolderTreeNode | null {
    for (const node of nodes) {
      if (node.id === targetId) return node;
      const found = findFolderById(node.children ?? [], targetId);
      if (found) return found;
    }
    return null;
  }

  function buildFolderTree(
    node: BookmarkNode | null,
    excludedId?: string,
  ): FolderTreeNode[] {
    if (!node) return [];
    return (node.children ?? [])
      .filter((child) => !child.url)
      .filter((child) => child.id !== excludedId)
      .map((child) => {
        const folder = child as FolderTreeNode;
        return {
          ...folder,
          children: buildFolderTree(folder, excludedId),
        };
      });
  }

  function collectFolderIds(nodes: FolderTreeNode[]): Set<string> {
    const ids = new Set<string>();
    for (const node of nodes) {
      ids.add(node.id);
      for (const childId of collectFolderIds(node.children ?? [])) {
        ids.add(childId);
      }
    }
    return ids;
  }

  function isProtectedRootFolder(folder: FolderTreeNode) {
    return !!folder.folderType;
  }

  function applySelection(nextFolderTree: FolderTreeNode[], preferredId?: string) {
    const nextSelectedId =
      (preferredId && findFolderById(nextFolderTree, preferredId)?.id) ||
      nextFolderTree[0]?.id ||
      "";
    selectedFolderId = nextSelectedId;
    const parentPath = nextSelectedId
      ? findPathToFolder(nextFolderTree, nextSelectedId)
      : null;
    expandedFolderIds = new Set(parentPath ?? []);
  }

  onMount(() => {
    folderTree = folders;
    applySelection(folderTree, bookmark.parentId ?? folders[0]?.id);
  });

  function toggleFolder(folderId: string) {
    expandedFolderIds = new Set(expandedFolderIds);
    if (expandedFolderIds.has(folderId)) {
      expandedFolderIds.delete(folderId);
    } else {
      expandedFolderIds.add(folderId);
    }
  }

  async function refreshFolderTree(preferredId?: string) {
    const [root] = await getBookmarks();
    const nextTree = buildFolderTree(root as FolderTreeNode, excludedFolderId);
    const validIds = collectFolderIds(nextTree);
    const nextExpandedIds = new Set(
      [...expandedFolderIds].filter((id) => validIds.has(id)),
    );
    folderTree = nextTree;
    selectedFolderId =
      (preferredId && findFolderById(nextTree, preferredId)?.id) ||
      (selectedFolderId && findFolderById(nextTree, selectedFolderId)?.id) ||
      nextTree[0]?.id ||
      "";
    expandedFolderIds = nextExpandedIds;
  }

  async function openCreateFolder() {
    const parentId = selectedFolderId || folderTree[0]?.id;
    if (!parentId) return;
    creatingParentId = parentId;
    creatingFolderTitle = "";
    editingFolderId = null;
    expandedFolderIds = new Set(expandedFolderIds).add(parentId);
    await tick();
    createInputEl?.focus();
  }

  async function submitCreateFolder() {
    const title = creatingFolderTitle.trim();
    if (!creatingParentId || !title || working) return;
    working = true;
    try {
      const created = await createBookmark({
        parentId: creatingParentId,
        title,
      });
      creatingParentId = null;
      creatingFolderTitle = "";
      await refreshFolderTree(created.id);
    } finally {
      working = false;
    }
  }

  function cancelCreateFolder() {
    creatingParentId = null;
    creatingFolderTitle = "";
  }

  async function handleCreateBlur() {
    const title = creatingFolderTitle.trim();
    if (!title) {
      cancelCreateFolder();
      return;
    }
    await submitCreateFolder();
  }

  async function startEditFolder(folder: FolderTreeNode) {
    if (isProtectedRootFolder(folder)) return;
    selectedFolderId = folder.id;
    creatingParentId = null;
    editingFolderId = folder.id;
    editingFolderTitle = folder.title ?? "";
    await tick();
    editInputEl?.focus();
  }

  async function submitRenameFolder() {
    const title = editingFolderTitle.trim();
    if (!editingFolderId || !title || working) return;
    working = true;
    try {
      await updateBookmark(editingFolderId, { title });
      const nextId = editingFolderId;
      editingFolderId = null;
      editingFolderTitle = "";
      await refreshFolderTree(nextId);
    } finally {
      working = false;
    }
  }

  function cancelRenameFolder() {
    editingFolderId = null;
    editingFolderTitle = "";
  }

  async function handleRenameBlur() {
    const title = editingFolderTitle.trim();
    if (!title) {
      cancelRenameFolder();
      return;
    }
    await submitRenameFolder();
  }

  function handleInlineInputKeydown(
    event: KeyboardEvent,
    action: "create" | "rename",
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      void (action === "create" ? submitCreateFolder() : submitRenameFolder());
    }
    if (event.key === "Escape") {
      event.preventDefault();
      if (action === "create") cancelCreateFolder();
      else cancelRenameFolder();
    }
  }

  function handleFolderEntryKeydown(event: KeyboardEvent, folder: FolderTreeNode) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectedFolderId = folder.id;
    }
  }

  async function clickSave() {
    if (!selectedFolderId) return;
    await onSave(selectedFolderId);
    onclickClose();
  }
</script>

<Popup type="m" title={t("nt_move_bookmark_title")} {onclickClose}>
<G>
  <div class="tree">
    {#each folderTree as folder (folder.id)}
      {@render folderNode(folder, 0)}
    {/each}
  </div>
</G>

  <div class="actions">
    <Button fill onclick={() => void openCreateFolder()} r="r1">
      <G align="c">
        <G>
          <T align="c">{t("nt_settings_bookmarks_add_folder")}</T>
        </G>
      </G>
    </Button>
    <Button bg="var(--c-text)" onclick={() => void clickSave()} r="r1">
      <G full>
        <G full>
          <T align="c" color="var(--c-bg)">{t("nt_save")}</T>
        </G>
      </G>
    </Button>
  </div>
</Popup>

{#snippet folderNode(folder: FolderTreeNode, depth: number)}
  {@const expanded = expandedFolderIds.has(folder.id)}
  {@const isEditing = editingFolderId === folder.id}
  <div class="folder_group">
    <div class="folder_row" style={`padding-left: ${depth * 16}px;`}>
      {#if folder.children?.length}
        <Button
          r="r_o"
          onclick={() => toggleFolder(folder.id)}
        >
          <G>
            <Icon
              name={expanded ? "FolderOpen" : "Folder"}
              color="var(--c-text)"
              opacity={0.7}
            />
          </G>
        </Button>
      {:else}
        <div class="folder_toggle_placeholder"></div>
      {/if}
      <div
        class="folder_entry"
        class:selected={selectedFolderId === folder.id}
        role="button"
        tabindex="0"
        onclick={() => (selectedFolderId = folder.id)}
        onkeydown={(event) => handleFolderEntryKeydown(event, folder)}
      >
        {#if isEditing}
          <input
            class="folder_input"
            name={`edit-folder-${folder.id}`}
            type="text"
            placeholder={t("nt_input_name")}
            bind:value={editingFolderTitle}
            bind:this={editInputEl}
            onkeydown={(event) => handleInlineInputKeydown(event, "rename")}
            onblur={() => void handleRenameBlur()}
          />
        {:else}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="folder_label"
            role="presentation"
            ondblclick={() => void startEditFolder(folder)}
          >
            <T nowrap>{folder.title || t("nt_unnamed")}</T>
            {#if selectedFolderId === folder.id}
              <Icon name='Check' color='var(--c-green)' opacity={0.6}/>
            {/if}
          </div>
        {/if}
      </div>
    </div>
    {#if expanded && folder.children?.length}
      <div class="folder_children" transition:slide={{ duration: 200 }}>
        {#each folder.children as child (child.id)}
          {@render folderNode(child, depth + 1)}
        {/each}
      </div>
    {/if}
    {#if creatingParentId === folder.id}
      <div
        class="folder_children creating_row"
        transition:slide={{ duration: 200 }}
      >
        <div class="folder_row folder_row_input" style={`padding-left: ${(depth + 1) * 16}px;`}>
          <div class="folder_toggle_placeholder"></div>
          <div class="folder_entry selected">
            <input
              class="folder_input"
              name={`create-folder-${folder.id}`}
              type="text"
              placeholder={t("nt_input_name")}
              bind:value={creatingFolderTitle}
              bind:this={createInputEl}
              onkeydown={(event) => handleInlineInputKeydown(event, "create")}
              onblur={() => void handleCreateBlur()}
            />
          </div>
        </div>
      </div>
    {/if}
  </div>
{/snippet}

<style>
  .tree {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: 360px;
    overflow-y: auto;
    overflow-x: hidden;
    gap: var(--gap);
    box-sizing: border-box;
    padding: var(--gap);
    border: 2px solid var(--c-border);
    border-radius: var(--r1);
  }
  .folder_group,
  .folder_children {
    display: flex;
    flex-direction: column;
    gap: calc(var(--gap) / 2);
    width: 100%;
  }
  .folder_row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: calc(var(--gap) / 2);
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
  }
  .folder_toggle_placeholder {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .folder_entry {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 36px;
    box-sizing: border-box;
    min-width: 0;
    background-color: transparent;
    border-radius: var(--r);
    padding: 0 var(--gap);
    cursor: default;
    /* transition: background-color 0.15s ease-out; */
  }
  .folder_entry:active{

    background-color: var(--c-mask);
  }
  .folder_entry.selected {
    background-color: var(--c-bg1);
  }
  .folder_label {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 40px;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .folder_row_input {
    width: 100%;
  }
  .creating_row {
    width: 100%;
  }
  .folder_input {
    width: 100%;
    min-width: 0;
    height: 40px;
    border: none;
    background: none;
    color: var(--c-text);
    font-size: var(--f-size-m);
    padding: 0 var(--gap);
    box-sizing: border-box;
    caret-color: var(--c-green);
  }
  .folder_input:focus {
    outline: none;
  }
  .folder_input::placeholder {
    color: var(--c-text-2);
  }
  .actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--gap);
    box-sizing: border-box;
  }
</style>
