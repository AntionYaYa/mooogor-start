<script lang="ts">

	type Align = "c" | "r";
	interface Props {
		children: any;
		vertical?: boolean;
		full?: boolean;
		gap?: boolean;
		align?: Align
	}
	let { children, vertical,full,align,gap }: Props = $props();
</script>

<div class="{vertical?'vertical':''} {align} {full?'full':''}" class:gap={gap}>
	{@render children()}
</div>

<style>
	div {
		display: flex;
		flex-direction: row;
		justify-content: flex-start;
		align-items: flex-start;
		padding: var(--gap);
		border-radius: var(--r);
	}
	.gap{
		gap: var(--gap);
	}
	.vertical {
		flex-direction: column;
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
	.full{
		width: 100%;
		box-sizing: border-box;
		overflow: hidden;
	}
</style>
