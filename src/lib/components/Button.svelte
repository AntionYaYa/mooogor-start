<script lang="ts">
	import G from "@/lib/components/G.svelte";
	import Icon from "@/lib/components/Icon.svelte";
	import type { IconName } from "@/lib/components/Icon.svelte";
	import T from "@/lib/components/T.svelte";

	type alignType = "c" | "r";
	interface Props {
		text?: string;
		iconName?: IconName;
		mini?: boolean;
		fill?: boolean;
		full?: boolean;
		skipTabFocus?: boolean;
		alignT?: alignType;
		onclick?: (event: MouseEvent) => void;
	}

	let {
		text,
		iconName,
		mini = false,
		fill = false,
		full = false,
		onclick,
		alignT,
		skipTabFocus
	}: Props = $props();
</script>

<button class="btn" class:fill class:unfill={!fill} class:full {onclick} tabindex={skipTabFocus?-1:undefined}>
	<G full>
		{#if text}
			<T
				type={mini ? "s" : "m"}
				bold={!mini}
				color={fill ? "var(--c-bg)" : undefined}
				align={alignT}
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

		border-radius: var(--r);
		background: none;
		padding: 0;
	}

	.btn:active {
		transform: translateY(2px);
		transition: all 0.1s ease-out;
	}
	.btn:focus-visible{
		outline: 2px solid var(--c-text);
	}

	.unfill:active {
		background-color: var(--c-mask);
	}

	.fill {
		background-color: var(--c-text);
		padding: var(--gap);
		border-radius: var(--r1);
	}
	.full {
		width: 100%;
		box-sizing: border-box;
	}
</style>
