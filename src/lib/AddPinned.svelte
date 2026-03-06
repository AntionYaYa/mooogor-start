<script lang="ts">
  import { onMount } from "svelte";
  import validator from "validator";
  import type { WebSite } from "@/lib/DB/DB";
  import { getDomainFromUrl } from "@/lib/DB/DB";
  import Button from "./components/Button.svelte";
  import Input from "./components/Input.svelte";
  import G from "./components/G.svelte";
  import T from "./components/T.svelte";
  import Popup from "./components/Popup.svelte";
  import Shake from "./components/Shake.svelte";
  import { t } from "@/lib/utils/i18n";

  interface Props {
    isEdit?: boolean;
    urlValue?:string;
    titleValue?:string;
    onSave: (newWebSite: WebSite) => void;
    onclickClose: () => void;
  }

  let { isEdit = false, urlValue ,titleValue,onSave, onclickClose }: Props = $props();
  let inputUrlValue = $state("");
  let inputTitleValue = $state("");
  let inputUrlValueErr = $state(false);

  onMount(()=>{
    if (urlValue) {
      inputUrlValue = urlValue
    }
    if (titleValue) {
      inputTitleValue = titleValue
    }
  })

  function clickSave() {
    inputUrlValueErr = false;
    if (validator.isURL(inputUrlValue)) {
      const newWebSite = {
        domain: getDomainFromUrl(inputUrlValue),
        url: inputUrlValue,
        title: inputTitleValue.trim(),
      };
      onSave(newWebSite);
      inputUrlValue = inputTitleValue = "";
      onclickClose();
    } else {
      inputUrlValueErr = true;
    }
  }
</script>

<Popup type='s' title={isEdit ? t("nt_edit_pinned_title") : t("nt_add_pinned_title")} {onclickClose}>
  <G full>
    <Shake shake={inputUrlValueErr}>
      <Input
        name="url"
        type="url"
        placeholder={t("nt_input_url")}
        bind:value={inputUrlValue}
      />
    </Shake>
  </G>
  <G full>
    <Input
      name="title"
      type="text"
      placeholder={t("nt_input_name")}
      bind:value={inputTitleValue}
    />
  </G>
  <G full>
      <Button fill onclick={clickSave} full>
        <G full>
        <T align="c" color="var(--c-bg)">{t("nt_save")}</T>
      </G>
      </Button>
  </G>
</Popup>
