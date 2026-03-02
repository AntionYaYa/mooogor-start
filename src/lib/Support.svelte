<script lang="ts">
  import Popup from "./components/Popup.svelte";
  import T from "./components/T.svelte";
  import { t } from "@/lib/utils/i18n";

  interface Props {
    onclickClose: () => void;
  }

  const wechatPayCode = {
    image: "/support/wechat-qr.jpg",
    tip: "微信",
  } as const;

  let { onclickClose }: Props = $props();
</script>

<Popup title={t("nt_about_support_button")} {onclickClose} type="m">
  <div class="wrap">
    <div class="qr_box">
      <img class="qr_img" src={wechatPayCode.image} alt={wechatPayCode.tip} />
      <T align="c" type="s" color="var(--c-text-1)"
        >{wechatPayCode.tip} {t("nt_support_scan_tip")}</T
      >
    </div>
  </div>
</Popup>

<style>
  .wrap {
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--gap);
  }
  .qr_box {
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--gap);
    padding: var(--gap);
  }
  .qr_img {
    width: min(280px, 70vw);
    object-fit: contain;
    border-radius: var(--r1);
    border: var(--border-1);
    background-color: var(--c-bg);
    padding: var(--gap);
    box-sizing: border-box;
  }
</style>
