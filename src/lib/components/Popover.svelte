<script lang="ts">
	import G from "./G.svelte";
	import { onMount, onDestroy } from "svelte";

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
	let positioned = $state(false);

	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return { destroy() { node.remove(); } };
	}

	function positionMenu() {
		if (!menuEl) return;
		const rect = menuEl.getBoundingClientRect();
		const gap = 8;
		menuEl.style.left = `${Math.max(gap, Math.min(x, window.innerWidth - rect.width - gap))}px`;
		menuEl.style.top = `${Math.max(gap, Math.min(y, window.innerHeight - rect.height - gap))}px`;
		positioned = true;
	}

	function handleMouseDown(e: MouseEvent) {
		if (menuEl && menuEl.contains(e.target as Node)) return;
		onClose();
	}

	onMount(() => {
		window.addEventListener("mousedown", handleMouseDown, true);
		window.addEventListener("resize", positionMenu);
		positionMenu();
	});

	onDestroy(() => {
		window.removeEventListener("mousedown", handleMouseDown, true);
		window.removeEventListener("resize", positionMenu);
	});
</script>

<div
	class:positioned
	bind:this={menuEl}
	use:portal
	style="top: {y}px; left:{x}px;"
>
	<G vertical full>
		{@render children()}
	</G>
</div>

<style>
	div {
		visibility: hidden;
		width: max-content;
		max-width: calc(100vw - 16px);
		max-height: calc(100vh - 16px);
		max-height: calc(100dvh - 16px);
		box-sizing: border-box;
		overflow-y: auto;
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
		z-index: 1100;
	}
	div.positioned {
		visibility: visible;
		animation: menu-appear 100ms ease-out;
	}
	@keyframes menu-appear { from { opacity: 0; } to { opacity: 1; } }
	@media (prefers-reduced-motion: reduce) { div.positioned { animation: none; } }
</style>
