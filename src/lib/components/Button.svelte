<script lang="ts">
	type Align = "c" | "r";

	interface Props {
		children: any;
		fill?: boolean;
		full?: boolean;
		align?: Align
		skipTabFocus?: boolean;
		disabled?: boolean;
		onclick?: (event: MouseEvent) => void;
	}

	let {
		children,
		fill = false,
		full = false,
		onclick,
		skipTabFocus,
		align,
		disabled = false,
	}: Props = $props();
</script>

<button class="btn {align}" class:fill class:unfill={!fill} class:full {onclick} {disabled} tabindex={skipTabFocus?-1:undefined}>
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
