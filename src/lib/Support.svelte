<script lang="ts">
  import Popup from "./components/Popup.svelte";
  import Tab from "./components/Tab.svelte";
  import type { TabItem } from "./components/Tab.svelte";
  import T from "./components/T.svelte";
  import { t } from "@/lib/utils/i18n";

  interface Props {
    onclickClose: () => void;
  }

  const payCodeMap = {
    paypal: {
      image: "/support/paypal-qr.svg",
      tip: "PayPal",
    },
    wechat: {
      image: "/support/wechat-qr.svg",
      tip: "微信",
    },
    alipay: {
      image: "/support/alipay-qr.svg",
      tip: "支付宝",
    },
  } as const;

  type PayType = keyof typeof payCodeMap;

  let { onclickClose }: Props = $props();
  let tabs: TabItem[] = $state([
    { key: "paypal", name: "PayPal", sel: true },
    { key: "wechat", name: "微信", sel: false },
    { key: "alipay", name: "支付宝", sel: false },
  ]);

  let currentType = $derived((tabs.find((tab) => tab.sel)?.key ?? "paypal") as PayType);

  function clickTab(tab: TabItem) {
    tabs.forEach((item) => {
      item.sel = item.key === tab.key;
    });
  }
</script>

<Popup title={t("nt_about_support_button")} {onclickClose} type="m">
  <div class="wrap">
    <Tab {tabs} onclick={(tab) => clickTab(tab)} />
    <div class="qr_box">
      <img
        class="qr_img"
        src={payCodeMap[currentType].image}
        alt={payCodeMap[currentType].tip}
      />
      <T align="c" type="s" color="var(--c-text-1)"
        >{payCodeMap[currentType].tip} {t("nt_support_scan_tip")}</T
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
    aspect-ratio: 1 / 1;
    object-fit: contain;
    border-radius: var(--r1);
    border: var(--border-1);
    background-color: var(--c-bg);
    padding: var(--gap);
    box-sizing: border-box;
  }
  @media (max-width: 720px) {
    .qr_img {
      width: min(260px, 82vw);
    }
  }
</style>
