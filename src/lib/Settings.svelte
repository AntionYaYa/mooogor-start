<script lang="ts">
  import G from "./components/G.svelte";
  import T from "./components/T.svelte";

  function setTheme(theme: "light" | "dark") {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }
</script>

<div >
  <G>
    <T>新标签页打开链接</T>
    <T>如果固定到Tab栏将自动开启</T>
  </G>
  <G>
    <T>语言设置</T>
  </G>
  <G>
    <T>默认打开位置</T>
    <T>常用 / 书签 / 历史记录</T>
  </G>
  <G>
    <T>建议反馈</T>
  </G>
  <G>
    <T>关于</T>
  </G>
  <G>
    <T>版本</T>
  </G>
  <G>
    <T>打赏</T>
  </G>
</div>
