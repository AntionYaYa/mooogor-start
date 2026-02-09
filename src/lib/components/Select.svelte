<script lang="ts">
	import Icon from "./Icon.svelte";
	import { onMount, onDestroy } from "svelte";
	import T from "./T.svelte";

	export type SelectOption = {
		label: string;
		value: string;
		sel: boolean;
	};

	interface Props {
		options: SelectOption[];
		onChange: (value: string) => void;
	}

	let {
		options,
		onChange,
	}: Props = $props();

	let open = $state(false);
	let rootEl: HTMLDivElement | null = null;
	let selected = $derived(options.find((o) => o.sel));

	function setOpen(next: boolean) {
		open = next;
	}

	function handleToggle() {
		setOpen(!open);
	}

	function handleSelect(option: SelectOption) {
		onChange(option.value);
		open = false;
	}

	function handleMouseDown(e: MouseEvent) {
		if (rootEl && rootEl.contains(e.target as Node)) return;
		open = false;
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === "Escape") open = false;
	}

	onMount(() => {
		window.addEventListener("mousedown", handleMouseDown);
		window.addEventListener("keydown", handleKeyDown);
	});

	onDestroy(() => {
		window.removeEventListener("mousedown", handleMouseDown);
		window.removeEventListener("keydown", handleKeyDown);
	});
</script>

<div class="select" bind:this={rootEl}>
	<button class="trigger" onclick={handleToggle}>
		<T>{selected ? selected.label : "请选择"}</T>
		<Icon
			name={open ? "ChevronUp" : "ChevronDown"}
			opacity={0.6}
			color="var(--c-text)"
		/>
	</button>
	{#if open}
		<div class="menu">
			<div class="menu_items">
				{#each options as option}
					<button class="option" onclick={() => handleSelect(option)}>
						<T bold={option.sel}>{option.label}</T>
						{#if option.sel}
							<Icon name="Check" color="var(--c-text)" opacity={0.6} />
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.option {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		width: 100%;
		box-sizing: border-box;
		background-color: unset;
		border: none;
		border-radius: var(--r);
		padding: var(--gap);
		align-items: center;
	}
	.option:active {
		background-color: var(--c-mask);
		transform: translateY(2px);
		transition: all 0.1s ease-out;
	}
	.select {
		position: relative;
		width: 100%;
		box-sizing: border-box;
		padding: var(--gap);
	}
	.trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--gap);
		width: 100%;
		box-sizing: border-box;
		background-color: var(--c-bg1);
		border: none;
		border-radius: var(--r1);
		padding: var(--gap);
		height: 40px;
	}
	.trigger:active {
		background-color: var(--c-bg1);
		transform: translateY(2px);
		transition: all 0.1s ease-out;
	}
	.trigger:focus-visible {
		outline: 2px solid var(--c-text);
	}
	.menu {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow);
		padding: var(--gap);
		z-index: 10;
		max-height: 260px;
		overflow-y: auto;
		box-sizing: border-box;
	}
	.menu_items {
		display: flex;
		flex-direction: column;
		width: 100%;
		box-sizing: border-box;
		background-color: var(--c-bg1);
		border-radius: var(--r1);
		padding: var(--gap);
	}

</style>
