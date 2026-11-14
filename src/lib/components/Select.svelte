<script lang="ts">
	import Icon from "./Icon.svelte";
	import Divider from "./Divider.svelte";
	import { onMount, onDestroy, tick } from "svelte";
	import T from "./T.svelte";
	import { t } from "@/lib/utils/i18n";
	import G from "./G.svelte";
	import Button from "./Button.svelte";
	import { menuTransition } from "@/lib/utils/menuTransition";

	export type SelectOption = {
		label: string;
		value: string;
		sel: boolean;
		dividerTop?: boolean;
	};

	interface Props {
		options: SelectOption[];
		onChange: (value: string) => void;
		disabled?: boolean;
		label?: string;
	}

	let { options, onChange, disabled = false, label }: Props = $props();
	let open = $state(false);
	let rootEl: HTMLDivElement | null = null;
	let menuEl: HTMLDivElement | null = $state(null);
	let menuItemsEl: HTMLDivElement | null = $state(null);
	let positioned = $state(false);
	let menuLeft = $state(0);
	let menuTop = $state(0);
	let menuWidth = $state(0);
	let menuMaxHeight = $state(268);
	let selected = $derived(options.find((o) => o.sel));

	function setOpen(next: boolean) {
		if (next && !menuEl) positioned = false;
		if (next && rootEl) {
			menuWidth = rootEl.getBoundingClientRect().width;
		}
		open = next;
		if (next) {
			void tick().then(updateMenuPosition);
		}
	}

	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.remove();
			},
		};
	}

	async function updateMenuPosition() {
		if (!open || !rootEl || !menuEl) return;
		const currentMenu = menuEl;
		// Commit the trigger width before measuring wrapped option content.
		menuWidth = rootEl.getBoundingClientRect().width;
		await tick();
		if (!open || disabled || menuEl !== currentMenu || !rootEl || !menuItemsEl) return;

		const viewportGap = 8;
		const defaultMaxHeight = 268;
		const anchor = rootEl.getBoundingClientRect();
		// Include the trigger's own area so the menu opens over the button.
		const availableBelow = Math.max(0, window.innerHeight - anchor.top - viewportGap);
		const availableAbove = Math.max(0, anchor.bottom - viewportGap);
		const menuPadding = currentMenu.offsetHeight - menuItemsEl.offsetHeight;
		const desiredHeight = Math.min(menuItemsEl.scrollHeight + menuPadding, defaultMaxHeight);
		const placeAbove = availableBelow < desiredHeight && availableAbove > availableBelow;
		const availableHeight = placeAbove ? availableAbove : availableBelow;
		const height = Math.min(desiredHeight, availableHeight);

		menuLeft = anchor.left;
		menuTop = placeAbove
			? Math.max(viewportGap, anchor.bottom - height)
			: anchor.top;
		menuMaxHeight = Math.max(0, Math.min(defaultMaxHeight, availableHeight));
		positioned = true;
	}

	function handleToggle() {
		if (disabled) return;
		setOpen(!open);
	}

	function handleSelect(option: SelectOption) {
		if (disabled) return;
		onChange(option.value);
		open = false;
	}

	function handleMouseDown(e: MouseEvent) {
		const target = e.target as Node;
		if (rootEl?.contains(target) || menuEl?.contains(target)) return;
		open = false;
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === "Escape") open = false;
	}

	onMount(() => {
		window.addEventListener("mousedown", handleMouseDown);
		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("resize", updateMenuPosition);
		window.addEventListener("scroll", updateMenuPosition, true);
	});

	onDestroy(() => {
		window.removeEventListener("mousedown", handleMouseDown);
		window.removeEventListener("keydown", handleKeyDown);
		window.removeEventListener("resize", updateMenuPosition);
		window.removeEventListener("scroll", updateMenuPosition, true);
	});
</script>

<div class="select" class:disabled bind:this={rootEl}>
	<Button {disabled} onclick={handleToggle} align="c" full fill r="r1"
		aria-label={label && `${label}, ${selected?.label ?? t("nt_select_placeholder")}`}
		aria-expanded={open}>
		<G full align="c">
			<G full>
				<T>{label ?? selected?.label ?? t("nt_select_placeholder")}</T>
			</G>
			{#if label}
				<div class="trigger_value">
					<T type="s" nowrap fullWidth={false}>{selected?.label ?? t("nt_select_placeholder")}</T>
				</div>
			{/if}
			<G>
				<Icon
					name={open ? "ChevronUp" : "ChevronDown"}
					opacity={0.6}
					color="var(--c-text)"
				/>
			</G>
		</G>
	</Button>
	{#if open && !disabled}
		<div
			class="menu"
			class:positioned
			bind:this={menuEl}
			use:portal
			transition:menuTransition|global
			onoutrostart={() => { if (disabled) open = false; }}
			style:left="{menuLeft}px"
			style:top="{menuTop}px"
			style:width="{menuWidth}px"
			style:max-height="{menuMaxHeight}px"
		>
			<div class="menu_items" bind:this={menuItemsEl}>
				{#each options as option}
					{#if option.dividerTop}
						<Divider />
					{/if}
					<button class="option" onclick={() => handleSelect(option)}>
						<G full align="c">
							<G full>
						{#if option.sel}
							<T color="var(--c-main)">{option.label}</T>
						{:else}
							<T color="var(--c-text)">{option.label}</T>
						{/if}
							</G>
						{#if option.sel}
							<Icon
								name="Check"
								color="var(--c-main)"
								opacity={0.6}
							/>
						{/if}
						</G>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.trigger_value {
		padding-block: var(--gap);
		padding-inline-start: var(--gap);
	}
	.option {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		width: 100%;
		box-sizing: border-box;
		background-color: unset;
		border: none;
		border-radius: var(--r);
		padding: 0;
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
	.select.disabled {
		opacity: 0.4;
	}
	.menu {
		visibility: hidden;
		position: fixed;
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow);
		border-radius: var(--r1);
		z-index: 1100;
		box-sizing: border-box;
		background-color: var(--c-bg1);
		padding: var(--gap);
	}
	.menu.positioned {
		visibility: visible;
	}
	.menu_items {
		min-height: 0;
		overflow-x: hidden;
		overflow-y: auto;
	}
	.menu_items::-webkit-scrollbar {
		width: calc(5px + var(--gap));
	}
	.menu_items::-webkit-scrollbar-thumb {
		border-inline-start: var(--gap) solid transparent;
		border-radius: 2.5px;
		border-start-start-radius: calc(var(--gap) + 2.5px) 2.5px;
		border-end-start-radius: calc(var(--gap) + 2.5px) 2.5px;
		background-clip: padding-box;
	}
</style>
