<script lang="ts">
  import validator from "validator";
  import Button from "./components/Button.svelte";
  import G from "./components/G.svelte";
  import Icon from "./components/Icon.svelte";
  import Input from "./components/Input.svelte";
  import Popup from "./components/Popup.svelte";
  import Shake from "./components/Shake.svelte";
  import T from "./components/T.svelte";
  import { t } from "@/lib/utils/i18n";

  interface Props {
    onSave: (value: { title: string; url?: string }) => void | Promise<void>;
    onclickClose: () => void;
  }

  let { onSave, onclickClose }: Props = $props();
  let type = $state<"bookmark" | "folder">("bookmark");
  let title = $state("");
  let url = $state("");
  let urlError = $state(false);
  let saving = $state(false);

  function selectType(nextType: "bookmark" | "folder") {
    type = nextType;
    urlError = false;
  }

  async function save() {
    if (saving) return;
    urlError = false;
    const nextUrl = url.trim();
    if (type === "bookmark" && !validator.isURL(nextUrl)) {
      urlError = true;
      return;
    }

    saving = true;
    try {
      await onSave({
        title: title.trim(),
        url: type === "bookmark" ? nextUrl : undefined,
      });
      onclickClose();
    } finally {
      saving = false;
    }
  }
</script>

<Popup type="s" title={t("nt_add_bookmark_title")} {onclickClose}>
  <div class="type_switch" role="group" aria-label={t("nt_add_bookmark_type")}>

    <Button fill={type === "bookmark"} r="r_o" align='c' onclick={() => selectType("bookmark")}>
      <G>
        <Icon name="Bookmark" color="var(--c-text)" size={18} />
        <T nowrap>{t("nt_bookmark")}</T>
      </G>
    </Button>

     <Button fill={type === "folder"} r="r_o" align='c' onclick={() => selectType("folder")}>
     <G>
      <Icon name="Folder" color="var(--c-text)" size={18} />
      <T nowrap>{t("nt_bookmark_folder")}</T>
     </G>
      </Button>
  </div>


  <G full>
    <Input
      name="title"
      type="text"
      placeholder={t("nt_input_name")}
      bind:value={title}
      disabled={saving}
    />
  </G>
  <div class="url_field" class:hidden={type === "folder"} aria-hidden={type === "folder"}>
    <G full>
      <Shake shake={urlError}>
        <Input
          name="url"
          type="url"
          placeholder={t("nt_input_url")}
          bind:value={url}
          disabled={saving || type === "folder"}
        />
      </Shake>
    </G>
  </div>
  <div class="actions">
    <Button fill r="r1" disabled={saving} onclick={onclickClose}>
      <G><G><T align="c">{t("nt_cancel")}</T></G></G>
    </Button>
    <Button
      bg="var(--c-text)"
      r="r1"
      disabled={saving}
      onclick={() => void save()}
    >
      <G full><G full><T align="c" color="var(--c-bg)">{t("nt_add")}</T></G></G>
    </Button>
  </div>
</Popup>

<style>
  .type_switch {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px;
    width: calc(100% - var(--gap) * 2);
    margin: var(--gap);
    padding: 2px;
    border: 2px solid var(--c-mask);
    border-radius: var(--r1);
    box-sizing: border-box;
  }
  .url_field {
    width: 100%;
  }
  .url_field.hidden {
    visibility: hidden;
    pointer-events: none;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--gap);
    width: 100%;
    padding: var(--gap);
    box-sizing: border-box;
  }
</style>
