<script lang="ts">
  import validator from "validator";
  import type { WebSite } from "@/lib/DB/DB";
  import { getDomainFromUrl } from "@/lib/DB/DB";
  import Button from "./components/Button.svelte";
  import Input from "./components/Input.svelte";
  import G from "./components/G.svelte";
  import Popup from "./components/Popup.svelte";
  import Shake from "./components/Shake.svelte";
  import { t } from "@/lib/utils/i18n";
  import T from "./components/T.svelte";

  interface Props {
    onclickClose: () => void;
  }

  let { onclickClose }: Props = $props();
</script>

<Popup title={t("nt_settings_about")} {onclickClose} type="m">
  <G>
    <G>
      <G>
        <img class="logo" src="/Mooogor.svg" alt="Mooogor2" />
      </G>
    </G>
  </G>
  <G  vertical>
    <G  vertical>
      <T type="l" bold>名称由来</T>
      <T type="m"
        >Mooogor是四川话的摸哥儿的谐音，摸哥儿是扒手的意思；我在开发的时候也使用了免费开源的框架和库，我相信你在平时工作中也会直接间接用到不少其他开发者的劳动成果，我们都是摸哥儿。</T
      >
    </G>
    <G  vertical>
      <T type="l" bold>设计初衷</T>
      <T type="m"
        >我参考了不少新标签页，大多都像系统桌面一样，很多实用功能，日历、任务、时钟等等……
        但是在Mooogor的设计逻辑里，可能花哨的卡片会打断新开标签页的初衷，因此未来对这类功能的支持优先级会比较低，反而能够减少在新标签页停留的功能优先级会非常高，也欢迎你提供相关建议。</T
      >
      <T type="m">antion1212@gmail.com</T>
    </G>
    <G  vertical>
      <T type="l" bold>免费吗？</T>
      <T type="m"
        >Mooogor是免费的！如果有非得需要云端功能才会考虑收费（因为云服务提供商会收费），考虑到安全和隐私问题，当然我会优先采用离线功能来实现。如果您觉得Mooogor能够满足你对新标签页的预期，也可以支持一下我，让我有更大的动力更新改进它。</T
      >
    </G>
    <G full vertical>
      <T type="m" align="r" bold>Ashton</T>
    </G>
  </G>
</Popup>

<style>
  .logo {
    width: 40px;
  }
</style>
