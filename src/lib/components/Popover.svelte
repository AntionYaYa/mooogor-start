<script lang="ts">
	import { slide } from "svelte/transition";
	import G from "./G.svelte";
	import { onMount, onDestroy, tick } from "svelte";

	interface Props {
		children: any;
		x?: number;
		y?: number;
		onClose: () => void;
	}
	let {
		children,
		x = 0,
		y = 0,
		onClose,
	}: Props = $props();

	let menuEl: HTMLDivElement | null = null;

	function handleMouseDown(e: MouseEvent) {
		if (menuEl && menuEl.contains(e.target as Node)) return;
		onClose();
	}

	onMount(() => {
		window.addEventListener("mousedown", handleMouseDown);
	});

	onDestroy(() => {
		window.removeEventListener("mousedown", handleMouseDown);
	});
</script>

<div
	bind:this={menuEl}
	style="top: {y}px; left:{x}px;"
	transition:slide={{ duration: 200 }}
>
	<G vertical>
		{@render children()}
	</G>
</div>

<style>
	div {
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: flex-start;
		padding: var(--gap);
		border-radius: var(--r1);
		background-color: var(--c-text-2);
		backdrop-filter: 50px;
		box-shadow: var(--shadow);
		position: fixed;
		z-index: 10;
	}
</style>
