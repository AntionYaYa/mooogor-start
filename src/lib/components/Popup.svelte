<script lang="ts">
	type Align = "c" | "r";
	interface Props {
		children: any;
		vertical?: boolean;
		full?: boolean;
		align?: Align;
	}
	let { children, vertical, full, align }: Props = $props();
</script>

<div class="mask">
	<div class="content">
		{@render children()}
	</div>
</div>

<style>
	.content {
		width: 100%;
		max-width: 320px;
		background-color: var(--c-bg);
		padding: 40px;
		display: flex;
		flex-direction: column;
		gap: var(--gap);
		align-items: center;
		border-radius: 40px;
	}
	.mask {
		position: fixed;
		top: 0;
		left: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.4);
	}
</style>
