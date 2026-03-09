<script lang="ts">
  import Popup from "./components/Popup.svelte";
  import Tab from "./components/Tab.svelte";
  import type { TabItem } from "./components/Tab.svelte";
  import T from "./components/T.svelte";
  import { getEffectiveLanguage, t } from "@/lib/utils/i18n";

  interface Props {
    onclickClose: () => void;
  }

  type SupportWayKey = "paypal" | "wechat" | "alipay";
  type SupportWay = {
    key: SupportWayKey;
    nameKey: string;
    image: string;
    scanHintKey: string;
    link?: string;
  };

  const supportWays: SupportWay[] = [
    {
      key: "paypal",
      nameKey: "nt_support_way_paypal",
      image: "/support/paypal-qr.jpg",
      scanHintKey: "nt_support_paypal_scan_hint",
      link: "https://www.paypal.com/ncp/payment/PYFARAAQ4KQYW",
    },
    {
      key: "wechat",
      nameKey: "nt_support_way_wechat",
      image: "/support/wechat-qr.jpg",
      scanHintKey: "nt_support_wechat_scan_hint",
    },
    {
      key: "alipay",
      nameKey: "nt_support_way_alipay",
      image: "/support/alipay-qr.jpg",
      scanHintKey: "nt_support_alipay_scan_hint",
    },
  ];

  function getDefaultSupportKey(): SupportWayKey {
    const language = getEffectiveLanguage();
    return language === "zh_CN"
      ? "wechat"
      : "paypal";
  }

  let { onclickClose }: Props = $props();
  let currentSupportKey = $state<SupportWayKey>(getDefaultSupportKey());
  let supportTabs: TabItem[] = $derived(
    supportWays.map((item) => ({
      key: item.key,
      name: t(item.nameKey),
      sel: item.key === currentSupportKey,
    })),
  );
  let currentSupportWay = $derived(
    supportWays.find((item) => item.key === currentSupportKey) ?? supportWays[0],
  );

  function clickSupportTab(tab: TabItem) {
    if (tab.key === currentSupportKey) return;
    currentSupportKey = tab.key as SupportWayKey;
  }
</script>

<Popup title={t("nt_about_support_button")} {onclickClose} type="m">
  <div class="wrap">
    <Tab tabs={supportTabs} onclick={(tab) => clickSupportTab(tab)} />
    <div class="qr_box">
      {#if currentSupportWay.link}
        <a
          class="qr_link"
          href={currentSupportWay.link}
          target="_blank"
          rel="noreferrer"
        >
          <img
            class="qr_img qr_img_link"
            src={currentSupportWay.image}
            alt={t(currentSupportWay.nameKey)}
          />
        </a>
      {:else}
        <img
          class="qr_img"
          src={currentSupportWay.image}
          alt={t(currentSupportWay.nameKey)}
        />
      {/if}
      <T align="c" type="s" color="var(--c-text-1)"
        >{t(currentSupportWay.scanHintKey)}</T
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
    border: var(--border);
    background-color: var(--c-bg);
    padding: var(--gap);
    box-sizing: border-box;
  }
  .qr_link {
    display: flex;
    border-radius: var(--r1);
  }
  .qr_img_link {
    cursor: pointer;
  }
</style>
