<script lang="ts">
	import G from "./G.svelte";

	interface Props {
		vertical?: boolean;
	}

	let { vertical = false }: Props = $props();
</script>

{#if vertical}
	<div class="v-container">
		<div class="v"></div>
	</div>
{:else}
	<G vertical full>
		<G vertical full>
			<hr />
		</G>
	</G>
{/if}

<style>
	hr {
		border: none;
		border-top: 1px solid var(--c-border);
		margin: 0;
		width: 100%;
		box-sizing: border-box;
		padding: 0;
		user-select: none;
	}
	.v-container {
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.v {
		width: 1px;
		height: 100%;
		background: var(--c-border);
		box-sizing: border-box;
		user-select: none;
	}
</style>
