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

	let isZooming = $state(false);

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

	function handleMaskClick(event: MouseEvent) {
		// 只在点击遮罩（弹窗外部）时触发
		if (event.target !== event.currentTarget) return;
		triggerZoom();
	}

	function triggerZoom() {
		isZooming = false;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				isZooming = true;
			});
		});
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="mask"
	transition:fade={{ duration: 200 }}
	onclick={handleMaskClick}
>
	<div
		class="panel {type}"
		class:zooming={isZooming}
		transition:fly={{ y: -50, duration: 200 }}
	>
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
	.panel {
		width: 100%;
		max-height: 100vh;
		background-color: var(--c-bg);
		padding: calc(var(--gap) * 2);
		display: flex;
		flex-direction: column;
		align-items: center;
		border-radius: calc(var(--r) * 2);
	}
	.panel.zooming {
		animation: zoom 0.2s ease-in-out;
	}
	@keyframes zoom {
		0% {
			transform: scale(1);
		}
		40% {
			transform: scale(1.06);
		}
		100% {
			transform: scale(1);
		}
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
