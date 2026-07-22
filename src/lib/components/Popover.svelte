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
		window.addEventListener("mousedown", handleMouseDown, true);
		requestAnimationFrame(() => {
			if (!menuEl) return;
			const fullHeight = menuEl.scrollHeight;
			const fullWidth = menuEl.scrollWidth;
			const vw = window.innerWidth;
			const vh = window.innerHeight;
			const gap = 8;
			let ax = x;
			let ay = y;
			if (ax + fullWidth > vw - gap) ax = Math.max(gap, vw - fullWidth - gap);
			if (ay + fullHeight > vh - gap) ay = Math.max(gap, vh - fullHeight - gap);
			ax = Math.max(gap, ax);
			ay = Math.max(gap, ay);
			if (ax !== x) menuEl.style.left = `${ax}px`;
			if (ay !== y) menuEl.style.top = `${ay}px`;
		});
	});

	onDestroy(() => {
		window.removeEventListener("mousedown", handleMouseDown, true);
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
		background-color: var(--c-mask);
		backdrop-filter:  blur(50px);
		box-shadow: var(--shadow);
		position: fixed;
		z-index: 10;
	}
</style>
