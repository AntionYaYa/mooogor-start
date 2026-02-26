<script lang="ts">
	import { slide } from "svelte/transition";
	import Button from "./Button.svelte";
	import Icon from "./Icon.svelte";

	interface Props {
		name: string;
		type: string;
		value: string;
		placeholder: string;
		disabled?: boolean;
		clearable?: boolean;
	}

	let {
		name,
		type,
		value = $bindable(""),
		placeholder = "",
		disabled = false,
		clearable = true,
	}: Props = $props();

	function clearValue() {
		value = "";
	}
</script>

<div class="input_g">
	{#if value.length}
		<h6 transition:slide={{ duration: 200 }}>{placeholder}</h6>
	{/if}
	<div class="input_v">
			<input {type} {name} bind:value {placeholder} {disabled}/>
			{#if clearable && value}
				<Button onclick={clearValue} skipTabFocus>
					<Icon name="X" size={16} opacity={0.6} color="var(--c-text)" />
				</Button>
			{/if}
		</div>
	</div>

<style>
	.input_g {
		display: flex;
		background-color: var(--c-bg);
		border-radius: var(--r1);
		padding: var(--gap);
		flex-direction: column;
		width: 100%;
		box-sizing: border-box;
	}
	.input_v {
		display: flex;
		align-items: center;
		width: 100%;
		box-sizing: border-box;
		border-radius: var(--r);
	}
	/* .input_v:focus-within {
		outline: var(--c-text) 1px solid;
	} */

	h6 {
		margin: 0;
		padding: calc(var(--gap) / 2) var(--gap);
		width: 100%;
		border-radius: var(--r);
		box-sizing: border-box;
		overflow: hidden;
		text-overflow: ellipsis;
		word-break: break-word;
		color: var(--c-text-1);
		font-size: var(--f-size-s);
		font-weight: normal;
	}

	input {
		color: var(--c-text);
		font-size: var(--f-size-m);
		background: none;
		border: none;
		padding: var(--gap);
		width: 100%;
		box-sizing: border-box;
		height: 36px;
		caret-color:var(--c-green);
	}

	input::selection{
      background-color: var(--c-green);
      color: var(--c-bg);
    }
	input::placeholder {
		color: var(--c-text-2);
	}

	input:focus {
		outline: none;
	}
</style>
