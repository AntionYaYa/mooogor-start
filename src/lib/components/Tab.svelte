<script lang="ts">
	import Button from "./Button.svelte";
	import G from "./G.svelte";
	import T from "./T.svelte";

	export type TabItem = {
		key: string;
		name: string;
		sel: boolean;
	};
	interface Props {
		tabs: TabItem[];
		onclick: (tab: TabItem, index: number) => void;
		selectedBg?: boolean;
		loading?: boolean;
	}
	let { tabs, onclick, selectedBg = true, loading = false }: Props = $props();
</script>

<div aria-hidden={loading}>
	{#each tabs as tab, index (tab.key)}
		<Button
			fill={loading || (selectedBg && tab.sel)}
			disabled={loading}
			onclick={() => onclick(tab, index)}
		>
			<G>
				<T color={loading ? "transparent" : tab.sel ? "var(--c-text)" : selectedBg ? "var(--c-text-1)" : "var(--c-text-2)"} nowrap>
					{tab.name}
				</T>
			</G>
		</Button>
	{/each}
</div>

<style>
	div {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: var(--gap);
		padding: var(--gap);
		width: 100%;
		box-sizing: border-box;
		justify-content: center;
		overflow: auto;
	}
</style>
