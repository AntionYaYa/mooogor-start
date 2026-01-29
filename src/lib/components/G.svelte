<script lang="ts">

	type Align = "c" | "r";
	interface Props {
		children: any;
		vertical?: boolean;
		align?: Align
	}
	let { children, vertical,align }: Props = $props();
</script>

<div class="{vertical?'vertical':''} {align}">
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
</style>
