<script lang="ts">
	import Icon from "./Icon.svelte";
	import type { name } from "./Icon.svelte";
	import T from "./T.svelte";

	interface Props {
		// children: any;
		text?: string;
		iconName?: name;
		mini?: boolean;
		onclick?: (event: MouseEvent) => void;
	}
	let { text, iconName, mini, onclick }: Props = $props();

</script>

<div class="input_g">
    <input
      class="input"
      name="title"
      bind:value={inputTitleValue}
      placeholder="名称"
    />
    <Button iconName="X" mini />
  </div>

<style>
	button {
		display: flex;
		border: none;
		background-color: unset;
		color: var(--c-text);
		padding: var(--gap);
		border-radius: var(--r);
	}
	button:active {
		background-color: var(--c-mask);
		transform: translateY(2px);
		transition: all 0.1s ease-out;
	}
</style>
