<script lang="ts">
	import Button from "./Button.svelte";
	import G from "./G.svelte";
	import Icon from "./Icon.svelte";

	interface Props {
		checked?: boolean;
		indeterminate?: boolean;
		onchange?: (event: Event) => void;
		skipTabFocus?: boolean;
		disabled?: boolean;
	}

	let {
		checked = false,
		indeterminate = false,
		onchange,
		skipTabFocus,
		disabled = false,
	}: Props = $props();
</script>

<Button skipTabFocus {disabled} onclick={onchange}>
	<G>
		<G>
			<span class="box" class:bg={checked || indeterminate}>
				{#if indeterminate}
					<Icon name="Minus" color="var(--c-bg)" size={16} />
				{:else if checked}
					<Icon name="Check" color="var(--c-bg)" size={16} />
				{/if}
			</span>
		</G>
	</G>
</Button>

<style>
	.box {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border: var(--border1);
		border-radius: var(--gap);
		box-sizing: border-box;
	}
	.bg {
		background-color: var(--c-text);
	}
</style>
