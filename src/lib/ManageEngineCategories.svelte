<script lang="ts">
  import { flip } from "svelte/animate";
  import { dndzone } from "svelte-dnd-action";
  import type { DndEvent } from "svelte-dnd-action";
  import type { EngineCategoryItem } from "@/lib/DB/DB";
  import Popup from "./components/Popup.svelte";
  import G from "./components/G.svelte";
  import T from "./components/T.svelte";
  import Icon from "./components/Icon.svelte";
  import { t } from "@/lib/utils/i18n";

  interface Props {
    categories: EngineCategoryItem[];
    saving?: boolean;
    onAdd: (name: string) => void | Promise<void>;
    onRename: (id: string, name: string) => void | Promise<void>;
    onDelete: (id: string) => void | Promise<void>;
    onReorder: (items: (EngineCategoryItem & { id: string })[]) => void | Promise<void>;
    onclickClose: () => void;
  }

  let {
    categories,
    saving = false,
    onAdd,
    onRename,
    onDelete,
    onReorder,
    onclickClose,
  }: Props = $props();

  let draftCategories: EngineCategoryItem[] = $state([]);
  let draftNameMap: Record<string, string> = $state({});
  let newCategoryName = $state("");

  $effect(() => {
    draftCategories = categories.map((item) => ({ ...item }));
    draftNameMap = Object.fromEntries(
      categories.map((item) => [item.id, item.name]),
    );
  });

  function setDraftName(id: string, value: string) {
    draftNameMap = {
      ...draftNameMap,
      [id]: value,
    };
  }

  async function handleCategoryBlur(category: EngineCategoryItem) {
    const nextName = draftNameMap[category.id]?.trim() ?? "";
    if (!nextName) {
      setDraftName(category.id, category.name);
      return;
    }
    if (nextName === category.name) return;
    await onRename(category.id, nextName);
  }

  async function handleAddCategory() {
    const nextName = newCategoryName.trim();
    if (!nextName) {
      return;
    }
    await onAdd(nextName);
    newCategoryName = "";
  }

  function handleCategoryKeydown(e: KeyboardEvent) {
    if (e.key !== "Enter") return;
    (e.currentTarget as HTMLInputElement).blur();
  }

  function handleAddCategoryKeydown(e: KeyboardEvent) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    void handleAddCategory();
  }

  function handleConsider(e: CustomEvent<DndEvent<EngineCategoryItem>>) {
    draftCategories = e.detail.items;
  }

  async function handleFinalize(e: CustomEvent<DndEvent<EngineCategoryItem>>) {
    draftCategories = e.detail.items;
    await onReorder(
      draftCategories
        .filter((item): item is EngineCategoryItem & { id: string } => !!item.id)
        .map((item, index) => ({
          ...item,
          order: index,
        })),
    );
  }
</script>

<Popup type="m" title={t("nt_settings_search_categories_title")} {onclickClose}>
  <div
    class="category_list"
    use:dndzone={{
      items: draftCategories,
      flipDurationMs: 200,
      type: "engine-categories",
      zoneTabIndex: -1,
      zoneItemTabIndex: -1,
      dropTargetStyle: {},
      dragDisabled: saving,
    }}
    onconsider={handleConsider}
    onfinalize={handleFinalize}
  >
    {#each draftCategories as category (category.id)}
      <div class="category_row" animate:flip={{ duration: 200 }}>
        <div class="drag_mark">
          <Icon name="Rows3" color="var(--c-text)" opacity={0.4} />
        </div>
        <input
          class="category_input"
          type="text"
          value={draftNameMap[category.id] ?? category.name}
          disabled={saving}
          placeholder={t("nt_settings_search_category_placeholder")}
          oninput={(e) =>
            setDraftName(category.id, (e.currentTarget as HTMLInputElement).value)}
          onblur={() => void handleCategoryBlur(category)}
          onkeydown={handleCategoryKeydown}
        />
        <button
          class="delete_btn"
          type="button"
          disabled={saving || categories.length <= 1}
          onclick={() => void onDelete(category.id)}
        >
          <T type="s">{t("nt_delete")}</T>
        </button>
      </div>
    {/each}
  </div>

  <div class="category_row add_row">
    <div class="drag_mark">
      <Icon name="Plus" color="var(--c-text)" opacity={0.4} />
    </div>
    <input
      class="category_input"
      type="text"
      bind:value={newCategoryName}
      disabled={saving}
      placeholder={t("nt_settings_search_category_add_placeholder")}
      onkeydown={handleAddCategoryKeydown}
    />
    <button
      class="add_btn"
      type="button"
      disabled={saving || !newCategoryName.trim()}
      onclick={() => void handleAddCategory()}
    >
      <T type="s">{t("nt_settings_search_add_category")}</T>
    </button>
  </div>

  <G full>
    <T type="s" color="var(--c-text-1)">
      {t("nt_settings_search_category_manage_hint")}
    </T>
  </G>
</Popup>

<style>
  .category_list {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    gap: var(--gap);
  }
  .category_row {
    display: flex;
    align-items: center;
    gap: var(--gap);
    width: 100%;
    box-sizing: border-box;
    background-color: var(--c-mask);
    border-radius: var(--r1);
    padding: var(--gap);
  }
  .drag_mark {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .category_input {
    width: 100%;
    box-sizing: border-box;
    border: none;
    background: transparent;
    color: var(--c-text);
    font-size: var(--f-size-m);
    min-width: 0;
  }
  .category_input::placeholder {
    color: var(--c-text-2);
  }
  .category_input:focus {
    outline: none;
  }
  .delete_btn {
    border: none;
    background-color: var(--c-bg1);
    border-radius: var(--r);
    padding: 4px 8px;
    color: var(--c-text);
    flex-shrink: 0;
  }
  .delete_btn:disabled {
    opacity: 0.4;
  }
  .add_btn {
    border: none;
    background-color: var(--c-bg1);
    border-radius: var(--r);
    padding: 4px 8px;
    color: var(--c-text);
    flex-shrink: 0;
  }
  .add_btn:disabled {
    opacity: 0.4;
  }
  .add_row {
    margin-top: var(--gap);
  }
</style>
