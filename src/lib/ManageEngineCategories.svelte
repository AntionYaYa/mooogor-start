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
  import Button from "./components/Button.svelte";

  interface Props {
    categories: EngineCategoryItem[];
    saving?: boolean;
    lockedIds?: string[];
    onAdd: (name: string) => void | Promise<void>;
    onRename: (id: string, name: string) => void | Promise<void>;
    onDelete: (id: string) => void | Promise<void>;
    onReorder: (
      items: (EngineCategoryItem & { id: string })[],
    ) => void | Promise<void>;
    onclickClose: () => void;
  }

  let {
    categories,
    saving = false,
    lockedIds = [],
    onAdd,
    onRename,
    onDelete,
    onReorder,
    onclickClose,
  }: Props = $props();

  function isLockedCategory(id: string) {
    return lockedIds.includes(id);
  }

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
        .filter(
          (item): item is EngineCategoryItem & { id: string } => !!item.id,
        )
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
        <G align="c" full fill r="r1">
          <Icon name="GripHorizontal" color="var(--c-text)" opacity={0.6} />
          <input
            class="category_input"
            type="text"
            value={draftNameMap[category.id] ?? category.name}
            disabled={saving}
            placeholder={t("nt_settings_search_category_placeholder")}
            oninput={(e) =>
              setDraftName(
                category.id,
                (e.currentTarget as HTMLInputElement).value,
              )}
            onblur={() => void handleCategoryBlur(category)}
            onkeydown={handleCategoryKeydown}
          />
          <Button
            onclick={() => void onDelete(category.id)}
            disabled={
              saving || categories.length <= 1 || isLockedCategory(category.id)
            }
          >
            <G>
              <Icon
                name="Minus"
                color="var(--c-text)"
                opacity={
                  categories.length > 1 && !isLockedCategory(category.id)
                    ? 1
                    : 0.2
                }
              />
            </G>
          </Button>
        </G>
      </div>
    {/each}
  </div>

  <G full>
    <G full fill r="r1" align="c">
      <input
        class="category_input"
        type="text"
        bind:value={newCategoryName}
        disabled={saving}
        placeholder={t("nt_settings_search_category_add_placeholder")}
        onkeydown={handleAddCategoryKeydown}
      />
      <Button
        disabled={saving || !newCategoryName.trim()}
        onclick={() => void handleAddCategory()}
      >
        <G>
          <Icon
            name="Plus"
            color="var(--c-text)"
            opacity={newCategoryName.length >= 1 ? 1 : 0.2}
          />
        </G>
      </Button>
    </G>
  </G>

  <G full>
    <T type="s">
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
    padding: var(--gap);
  }
  .category_row {
    display: flex;
    align-items: center;
    gap: var(--gap);
    width: 100%;
    box-sizing: border-box;
    border-radius: var(--r1);
  }

  .category_input {
    width: 100%;
    box-sizing: border-box;
    border: none;
    background: transparent;
    color: var(--c-text);
    font-size: var(--f-size-m);
    min-width: 0;
    padding: var(--gap);
  }
  .category_input::placeholder {
    color: var(--c-text-2);
  }
  .category_input:focus {
    outline: none;
  }
</style>
