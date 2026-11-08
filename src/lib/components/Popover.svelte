<script lang="ts">
	import G from "./G.svelte";
	import { onMount, onDestroy } from "svelte";
	import { menuTransition } from "@/lib/utils/menuTransition";

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

	function placeMenu(node: HTMLElement, point: { x: number; y: number }) {
		function positionMenu() {
			const { width, height } = node.getBoundingClientRect();
			const gap = 8;
			node.style.left = `${Math.max(gap, Math.min(point.x, window.innerWidth - width - gap))}px`;
			node.style.top = `${Math.max(gap, Math.min(point.y, window.innerHeight - height - gap))}px`;
			positioned = true;
		}

		positionMenu();
		window.addEventListener("resize", positionMenu);
		return {
			update(next: { x: number; y: number }) {
				point = next;
				positionMenu();
			},
			destroy() {
				window.removeEventListener("resize", positionMenu);
			},
		};
	}

	function handleMouseDown(e: MouseEvent) {
		if (!menuEl || menuEl.inert || menuEl.contains(e.target as Node)) return;
		onClose();
	}

	onMount(() => {
		window.addEventListener("mousedown", handleMouseDown, true);
	});

	onDestroy(() => {
		window.removeEventListener("mousedown", handleMouseDown, true);
	});
</script>

<div
	class:positioned
	bind:this={menuEl}
	use:portal
	use:placeMenu={{ x, y }}
	transition:menuTransition|global
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
	}
</style>
