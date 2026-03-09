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
	}
	let { tabs, onclick }: Props = $props();
</script>

<div>
	{#each tabs as tab,i}
		<button class={tab.sel ? "sel" : "unsel"} onclick={() => onclick(tab,i)}>
			<T color={tab.sel ? "var(--c-text)" : "var(--c-text-1)"}
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
	.unsel {
		background-color: unset;
	}
</style>
