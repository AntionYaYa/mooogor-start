<script lang="ts">
  import { slide } from "svelte/transition";
  import G from "./components/G.svelte";
  import T from "./components/T.svelte";
  import Switch from "./components/Switch.svelte";
  import Select, { type SelectOption } from "./components/Select.svelte";
  interface Props {
    children: any;
    showSetting: boolean;
    newTabOpen: boolean;
  }
  let { children, showSetting, newTabOpen }: Props = $props();

  let languageOptions = $state<SelectOption[]>([
    { label: "简体中文", value: "zh-CN", sel: true },
    { label: "English", value: "en-US", sel: false },
  ]);
  let language = $state("zh-CN");

  function setLanguage(value: string) {
    language = value;
    languageOptions = languageOptions.map((o) => ({
      ...o,
      sel: o.value === value,
    }));
  }

  let openPosOptions = $state<SelectOption[]>([
    { label: "常用", value: "common", sel: true },
    { label: "书签", value: "bookmark", sel: false },
    { label: "历史记录", value: "history", sel: false },
  ]);
  let openPos = $state("common");

  function setOpenPos(value: string) {
    openPos = value;
    openPosOptions = openPosOptions.map((o) => ({
      ...o,
      sel: o.value === value,
    }));
  }
</script>

<div class="layout">
  <div class="left" class:shrink={showSetting}>
    <div class="apge_box" class:radius={showSetting}>
      {@render children()}
    </div>
  </div>
  {#if showSetting}
    <div class="setting" transition:slide={{ duration: 300, axis: "x" }}>
      {@render temSettiong()}
    </div>
  {/if}
</div>

{#snippet temSettiong()}
  <div class="setting_con">
    {@render temsettingItem()}
    {@render temselectItem("语言设置", languageOptions, setLanguage)}
    {@render temselectItem("默认打开位置", openPosOptions, setOpenPos)}
    <G vertical>
      <T>建议反馈</T>
    </G>
    <G vertical>
      <T>关于</T>
    </G>
    <G vertical>
      <T>版本</T>
    </G>
    <G vertical>
      <T>打赏</T>
    </G>
  </div>
{/snippet}

{#snippet temsettingItem()}
  <G align="c" full>
    <G vertical full>
      <T>新标签页打开链接</T>
      <T type="s">如果固定到Tab栏将自动开启</T>
    </G>
    <G>
      <Switch
        turnOn={newTabOpen}
        onSwitch={(swith) => {
          newTabOpen = swith;
        }}
      ></Switch>
    </G>
  </G>
{/snippet}

{#snippet temselectItem(title: string, options: SelectOption[], onChange: (value: string) => void)}
  <div class="select_item">
    <G vertical full>
      <T>{title}</T>
    </G>
    <Select {options} {onChange} />
  </div>
{/snippet}

<style>
  .select_item {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
  }
  .setting_con {
    width: 300px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .apge_box {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    height: 100%;
    box-sizing: border-box;

    /* background: url(../../assets/bg3.jpg); */
    background-color: var(--c-bg);

    position: relative;
    overflow: hidden;
  }
  .radius {
    border-radius: var(--r1);
  }
  .shrink {
    padding: var(--gap);
  }
  .left {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    position: relative;
    align-items: center;
    background-color: var(--c-bg-1);
    transition: padding 0.3s ease-out;
  }
  .setting {
    display: flex;
    flex-direction: column;
    padding: var(--gap) var(--gap) var(--gap) 0;
  }
  .layout {
    display: flex;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }
</style>
