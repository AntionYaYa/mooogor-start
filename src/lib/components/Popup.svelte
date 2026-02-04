<script lang="ts">
	import G from "./G.svelte";
	import T from "./T.svelte";
	import Button from "./Button.svelte";
	import { fade, fly } from "svelte/transition";
	import { onMount, onDestroy } from "svelte";

	interface Props {
		children: any;
		title: string;
		onclickClose: () => void;
		shake?: boolean;
	}
	let { children, title, onclickClose, shake = false }: Props = $props();

	

	onMount(() => {
		window.addEventListener("keydown", handleKeyDown);
	});

	onDestroy(() => {
		window.removeEventListener("keydown", handleKeyDown);
	});

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === "Escape") {
			onclickClose();
		}
	}
</script>

<div class="mask" transition:fade>
	<div class="content"  transition:fly={{ y: 200, duration: 300 }}>
		<G full align="c">
			<T>{title}</T>
			<Button iconName="X" onclick={onclickClose} />
		</G>
		<G vertical full>
			{@render children()}
		</G>
	</div>
</div>

<style>
	.content {
		width: 100%;
		max-width: 320px;
		background-color: var(--c-bg);
		padding: calc(var(--gap) * 2);
		display: flex;
		flex-direction: column;
		align-items: center;
		border-radius: calc(var(--r) * 2);
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
