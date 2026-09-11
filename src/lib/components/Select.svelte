<script lang="ts">
	import Icon from "./Icon.svelte";
	import Divider from "./Divider.svelte";
	import { onMount, onDestroy, tick } from "svelte";
	import T from "./T.svelte";
	import { t } from "@/lib/utils/i18n";
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
		disabled?: boolean;
	}

	let { options, onChange, disabled = false }: Props = $props();
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
		positioned = false;
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
				// The disabled branch removes the menu; reset its state here too.
				open = false;
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
		const desiredHeight = Math.min(menuItemsEl.scrollHeight, defaultMaxHeight);
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
	<Button {disabled} onclick={handleToggle} align="c" full fill r="r1">
		<G full align="c">
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
		</G>
	</Button>
	{#if open && !disabled}
		<div
			class="menu"
			class:positioned
			bind:this={menuEl}
			use:portal
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
		overflow-y: auto;
		box-sizing: border-box;
	}
	.menu.positioned {
		visibility: visible;
		animation: menu-fade-in 100ms ease-out;
	}
	@keyframes menu-fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	@media (prefers-reduced-motion: reduce) {
		.menu.positioned { animation: none; }
	}
	.menu_items {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		width: 100%;
		box-sizing: border-box;
		background-color: var(--c-bg1);
		border-radius: var(--r1);
		padding: var(--gap);
	}
</style>
