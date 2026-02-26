<script lang="ts">
	import G from "@/lib/components/G.svelte";
	type Align = "c" | "r";

	interface Props {
		children: any;
		fill?: boolean;
		full?: boolean;
		align?: Align
		skipTabFocus?: boolean;
		onclick?: (event: MouseEvent) => void;
	}

	let {
		children,
		fill = false,
		full = false,
		onclick,
		skipTabFocus,
		align,
	}: Props = $props();
</script>

<button class="btn {align}" class:fill class:unfill={!fill} class:full {onclick} tabindex={skipTabFocus?-1:undefined}>
		{@render children()}
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
		border-radius: var(--r);
	}
	.full {
		width: 100%;
		box-sizing: border-box;
	}
	.c {
		justify-content: center;
		align-content: center;
		align-items: center;
	}
	.r {
		justify-content: flex-end;
		align-content: flex-end;
		align-items: flex-end;
	}
</style>
