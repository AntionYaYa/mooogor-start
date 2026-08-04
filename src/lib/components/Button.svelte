<script lang="ts">
	type Align = "c" | "r";
	type R = "r_o" | "r1" | "r2" | "r3";

	interface Props {
		children: any;
		fill?: boolean;
		full?: boolean;
		sel?: boolean;
		align?: Align;
		r?: R;
		bg?: string;
		skipTabFocus?: boolean;
		disabled?: boolean;
		title?: string;
		onclick?: (event: MouseEvent) => void;
	}

	let {
		children,
		fill = false,
		full = false,
		sel = false,
		onclick,
		skipTabFocus,
		align,
		r,
		disabled = false,
		bg,
		title,
	}: Props = $props();
</script>

<button
	class="btn {align} {r}"
	style="background-color: {bg};"
	class:fill
	class:full
	class:sel
	{onclick}
	{disabled}
	{title}
	tabindex={skipTabFocus ? -1 : undefined}
>
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
		background-color: var(--c-mask);
	}

	.btn:focus-visible {
		outline: 2px solid var(--c-text);
	}

	.fill {
		background-color: var(--c-mask);
	}
	.fill:active{
		background-color: var(--c-mask1);
	}
	.full {
		width: 100%;
		box-sizing: border-box;
		min-width: 0;
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
	.r_o {
		border-radius: var(--r);
	}
	.r1 {
		border-radius: var(--r1);
	}
	.r2 {
		border-radius: var(--r2);
	}
	.r3 {
		border-radius: var(--r3);
	}
	.sel{
		outline: 2px solid var(--c-main);
		background-color: var(--c-main-3);
	}
</style>
