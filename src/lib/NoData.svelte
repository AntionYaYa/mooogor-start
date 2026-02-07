<script lang="ts">
  import G from "./components/G.svelte";
  import Icon from "./components/Icon.svelte";
  import T from "./components/T.svelte";

  interface Props {
    text: string;
  }

  let { text }: Props = $props();
</script>

<G vertical>
  <G full align='c'>
    <Icon name="Sprout" color="var(--c-text)" size={30} />
  </G>
  <T align="c" type='s'>{text}</T>
</G>

<style>
</style>
