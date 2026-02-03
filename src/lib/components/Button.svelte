<script lang="ts">
	import G from "./G.svelte";
	import Icon from "./Icon.svelte";
	import type { name } from "./Icon.svelte";
	import T from "./T.svelte";

	interface Props {
		text?: string;
		iconName?: name;
		mini?: boolean;
		fill?: boolean;
		onclick?: (event: MouseEvent) => void;
	}

	let {
		text,
		iconName,
		mini = false,
		fill = false,
		onclick,
	}: Props = $props();
</script>

<button class="btn" class:fill class:unfill={!fill} {onclick}>
	<G>
		{#if text}
			<T
				type={mini ? "s" : "m"}
				bold={!mini}
				color={fill ? "var(--c-bg)" : undefined}
			>
				{text}
			</T>
		{:else if iconName}
			<Icon
				name={iconName}
				size={mini ? 16 : 20}
				opacity={mini ? 0.6 : 1}
				color={fill ? "var(--c-bg)" : "var(--c-text)"}
			/>
		{/if}
	</G>
</button>

<style>
	.btn {
		display: flex;
		border: none;
		padding: var(--gap);
		border-radius: var(--r);
		background: none;
	}

	.btn:active {
		transform: translateY(2px);
		transition: all 0.1s ease-out;
	}

	.unfill:active {
		background-color: var(--c-mask);
	}

	.fill {
		background-color: var(--c-text);
	}
</style>
