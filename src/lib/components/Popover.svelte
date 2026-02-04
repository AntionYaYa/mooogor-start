<script lang="ts">
	import { slide } from "svelte/transition";
	import G from "./G.svelte";

	interface Props {
		children: any;
		x?: number;
		y?: number;
		onClose: () => void;
	}
	let {
		children,
		x: initialX = 0,
		y: initialY = 0,
		onClose,
	}: Props = $props();

	import { onMount, onDestroy, tick } from "svelte";

	let menuEl: HTMLDivElement | null = null;
	let posX = $state(0);
	let posY = $state(0);

	async function adjustPosition() {
		if (!menuEl) return;

		// 等待一帧，确保 DOM 已渲染并有正确尺寸
		await tick();

		const rect = menuEl.getBoundingClientRect();
		const padding = 8;
		const vw = document.documentElement.scrollWidth;
		const vh = document.documentElement.scrollHeight;

		let newX = posX;
		let newY = posY;

		if (newX + rect.width + padding > vw) {
			newX = Math.max(padding, vw - rect.width - padding);
		}
		if (newY + rect.height + padding > vh) {
			newY = Math.max(padding, vh - rect.height - padding);
		}

		posX = newX;
		posY = newY;
	}
	function handleMouseDown(e: MouseEvent) {
		if (menuEl && menuEl.contains(e.target as Node)) return;
		onClose();
	}

	onMount(() => {
		posX = initialX;
		posY = initialY;
		window.addEventListener("mousedown", handleMouseDown);
		adjustPosition();
	});

	onDestroy(() => {
		window.removeEventListener("mousedown", handleMouseDown);
	});
</script>

<div
	bind:this={menuEl}
	style="top: {posY}px; left:{posX}px;"
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
		background-color: var(--c-bg1);
		box-shadow: var(--shadow);
		position: fixed;
		z-index: 10;
	}
</style>
