<script lang="ts">
  import G from "./components/G.svelte";
  import Icon from "./components/Icon.svelte";
  import type {IconName} from "./components/Icon.svelte";
  import T from "./components/T.svelte";

  interface Props {
    title:string
    text?: string;
    iconName: IconName;
  }

  let { text,title,iconName }: Props = $props();
</script>
  <G vertical>
    <G full align='c'>
      <Icon name={iconName} color="var(--c-text)" opacity={0.7} size={30} />
    </G>
    <T align="c" type='m'>{title}</T>
    <T align="c" type='s'>{text}</T>
  </G>