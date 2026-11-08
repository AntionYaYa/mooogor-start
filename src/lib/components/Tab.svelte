<script lang="ts">
	import T from "./T.svelte";

	export type TabItem = {
		key: string;
		name: string;
		sel: boolean;
	};
	interface Props {
		// children: any;
		tabs: TabItem[];
		onclick: (tab: TabItem,i:number) => void;
		selectedBg?: boolean;
		loading?: boolean;
	}
	let { tabs, onclick, selectedBg = true, loading = false }: Props = $props();
</script>

<div aria-hidden={loading}>
	{#each tabs as tab,i}
		<button
			class={tab.sel ? (selectedBg ? "sel" : "sel_nobg") : "unsel"}
			class:skeleton={loading}
			disabled={loading}
			onclick={() => onclick(tab,i)}
		>
			<T color={loading ? "transparent" : tab.sel ? "var(--c-text)" : selectedBg?"var(--c-text-1)":'var(--c-text-2)'} nowrap
				>{tab.name}</T
			>
		</button>
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
	button {
		display: flex;
		border: none;
		padding: var(--gap);
		border-radius: var(--r);
	}
	button:focus-visible{
    	outline: var(--c-text) 2px solid;
	}
	button:active {
		background-color: var(--c-mask);
	}
	.sel {
		background-color: var(--c-mask);
		/* font-weight: bold; */
	}
	.sel_nobg {
		background-color: unset;
	}
	.unsel {
		background-color: unset;
	}
	.skeleton {
		background-color: var(--c-mask);
	}
</style>
