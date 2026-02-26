<script lang="ts">
	import G from "@/lib/components/G.svelte";

	interface Props {
		children: any;
		fill?: boolean;
		full?: boolean;
		skipTabFocus?: boolean;
		onclick?: (event: MouseEvent) => void;
	}

	let {
		children,
		fill = false,
		full = false,
		onclick,
		skipTabFocus
	}: Props = $props();
</script>

<button class="btn" class:fill class:unfill={!fill} class:full {onclick} tabindex={skipTabFocus?-1:undefined}>
	<G full>
		{@render children()}
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
