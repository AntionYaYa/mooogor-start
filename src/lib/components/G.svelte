<script lang="ts">

	type Align = "c" | "r";
	interface Props {
		children: any;
		vertical?: boolean;
		full?: boolean;
		align?: Align
	}
	let { children, vertical,full,align }: Props = $props();
</script>

<div class="{vertical?'vertical':''} {align} {full?'full':''}">
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
	}
</style>
