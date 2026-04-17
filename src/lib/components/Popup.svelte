<script lang="ts">
	import G from "./G.svelte";
	import T from "./T.svelte";
	import Button from "./Button.svelte";
	import Icon from "./Icon.svelte";
	import { fade, fly } from "svelte/transition";
	import { onMount, onDestroy } from "svelte";

	type Type = "s" | "m" |'l';
	interface Props {
		children: any;
		title: string;
		onclickClose: () => void;
		shake?: boolean;
		type: Type;
		hideHeader?: boolean;
	}
	let { children, title, onclickClose, type, hideHeader = false }: Props = $props();

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

<div class="mask" transition:fade={{ duration: 200 }}>
	<div class="pannel {type}" transition:fly={{ y: -50, duration: 200 }}>
		{#if !hideHeader}
			<G full align="c">
				<T>{title}</T>
				<Button onclick={onclickClose}>
					<G>
						<Icon name="X" color="var(--c-text)" />
					</G>
				</Button>
			</G>
		{/if}
		<div class="content">
			{@render children()}
		</div>
	</div>
</div>

<style>
	.content {
		display: flex;
		flex-direction: column;
		height: 100%;
		box-sizing: border-box;
		overflow-y: auto;
		width: 100%;
	}
	.s {
		max-width: 320px;
	}
	.m {
		max-width: 460px;
	}
	.l {
		max-width: 600px;
	}
	.pannel {
		width: 100%;
		max-height: 100vh;
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
