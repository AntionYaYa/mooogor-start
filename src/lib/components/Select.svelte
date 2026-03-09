<script lang="ts">
	import Icon from "./Icon.svelte";
	import Divider from "./Divider.svelte";
	import { onMount, onDestroy } from "svelte";
	import T from "./T.svelte";
	import { t } from "@/lib/utils/i18n";
	import { slide } from "svelte/transition";
	import G from "./G.svelte";
    import Button from "./Button.svelte";

	export type SelectOption = {
		label: string;
		value: string;
		sel: boolean;
		dividerTop?: boolean;
	};

	interface Props {
		options: SelectOption[];
		onChange: (value: string) => void;
	}

	let { options, onChange }: Props = $props();
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
	<div class="trigger" >
		<Button onclick={handleToggle} align='c' full>
			<G full>
				<T>{selected ? selected.label : t("nt_select_placeholder")}</T>
			</G>
			<G>
				<Icon
					name={open ? "ChevronUp" : "ChevronDown"}
					opacity={0.6}
					color="var(--c-text)"
				/>
			</G>
		</Button>
	</div>
	{#if open}
		<div class="menu" transition:slide={{ duration: 200 }}>
			<div class="menu_items">
				{#each options as option}
					{#if option.dividerTop}
						<Divider />
					{/if}
					<button class="option" onclick={() => handleSelect(option)}>
						<T color="var(--c-text)">{option.label}</T>
						<Icon
							name="Check"
							color="var(--c-green)"
							opacity={option.sel ? 0.6 : 0}
						/>
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
	}
	.select {
		position: relative;
		width: 100%;
		box-sizing: border-box;
	}
	.trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		box-sizing: border-box;
		background-color: var(--c-mask);
		border-radius: var(--r1);
		padding: var(--gap);
	}
	.trigger:active {
		background-color: var(--c-mask);
	}
	.trigger:focus-visible {
		outline: 2px solid var(--c-text);
	}
	.menu {
		position: absolute;
		left: 0;
		top: 0;
		right: 0;
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow);
		border-radius: var(--r1);
		z-index: 10;
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
