<script lang="ts">

	type Align = "c" | "r";
	type R ="r_o"| "r1" | "r2"|"r3";
	
	interface Props {
		children: any;
		vertical?: boolean;
		full?: boolean;
		fill?: boolean
		r?: R;
		gap?: boolean;
		align?: Align
	}
	let { children, vertical,full,align,gap, r,fill }: Props = $props();
</script>

<div class="{vertical?'vertical':''} {align} {r}" class:full={full}  class:gap={gap} class:fill={fill}>
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

	.r_o{
		border-radius: var(--r);
	}
	.r1{
		border-radius: var(--r1);
	}
	.r2{
		border-radius: var(--r2);
	}
	.r3{
		border-radius: var(--r3);
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
	.fill{
		background-color: var(--c-mask);
	}
</style>
