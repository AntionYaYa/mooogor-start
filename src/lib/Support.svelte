<script lang="ts">
  import Popup from "./components/Popup.svelte";
  import Tab from "./components/Tab.svelte";
  import type { TabItem } from "./components/Tab.svelte";
  import T from "./components/T.svelte";
  import { t } from "@/lib/utils/i18n";

  interface Props {
    onclickClose: () => void;
  }

  const supportWays = [
    {
      key: "wechat",
      name: "微信",
      image: "/support/wechat-qr.jpg",
      tip: "微信",
    },
    {
      key: "paypal",
      name: "PayPal",
      image: "/support/paypal-qr.jpg",
      tip: "PayPal",
    },
  ] as const;

  let { onclickClose }: Props = $props();
  let supportTabs: TabItem[] = $state(
    supportWays.map((item, index) => ({
      key: item.key,
      name: item.name,
      sel: index === 0,
    })),
  );
  let currentSupportKey = $state<string>(supportWays[0].key);
  let currentSupportWay = $derived(
    supportWays.find((item) => item.key === currentSupportKey) ?? supportWays[0],
  );

  function clickSupportTab(tab: TabItem) {
    if (tab.sel) return;
    supportTabs.forEach((item) => {
      item.sel = item.key === tab.key;
    });
    currentSupportKey = tab.key;
  }
</script>

<Popup title={t("nt_about_support_button")} {onclickClose} type="m">
  <div class="wrap">
    <Tab tabs={supportTabs} onclick={(tab) => clickSupportTab(tab)} />
    <div class="qr_box">
      <img
        class="qr_img"
        src={currentSupportWay.image}
        alt={currentSupportWay.tip}
      />
      <T align="c" type="s" color="var(--c-text-1)"
        >{currentSupportWay.tip} {t("nt_support_scan_tip")}</T
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
