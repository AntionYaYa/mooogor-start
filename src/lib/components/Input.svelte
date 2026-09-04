<script lang="ts">
	import { slide } from "svelte/transition";
	import Button from "./Button.svelte";
	import Icon from "./Icon.svelte";
	import G from "./G.svelte";
	import T from "./T.svelte";

	interface Props {
		name: string;
		type: string;
		value: string;
		err?: string;
		placeholder: string;
		disabled?: boolean;
		clearable?: boolean;
	}

	let {
		name,
		type,
		value = $bindable(""),
		err,
		placeholder = "",
		disabled = false,
		clearable = true,
	}: Props = $props();

	function clearValue() {
		value = "";
	}
</script>

<div class="input_g">
	<G fill full vertical r="r1">
		{#if value.length}
			<h6 transition:slide={{ duration: 200 }}>{placeholder}</h6>
		{/if}
		<div class="input_v">
			<input {type} {name} bind:value {placeholder} {disabled} />
			{#if clearable && value}
				<Button onclick={clearValue} skipTabFocus>
					<G>
						<Icon
							name="X"
							size={16}
							opacity={0.6}
							color="var(--c-text)"
						/>
					</G>
				</Button>
			{/if}
		</div>
	</G>
	{#if err && err.length}
		<i transition:slide={{ duration: 200 }}>{err}</i>
	{/if}
</div>

<style>
	i {
		margin: 0;
		padding: calc(var(--gap) / 2) var(--gap);
		width: 100%;
		border-radius: var(--r);
		box-sizing: border-box;
		overflow: hidden;
		text-overflow: ellipsis;
		word-break: break-word;
		color: var(--c-red);
		font-size: var(--f-size-s);
	}
	.input_g {
		display: flex;
		border-radius: var(--r1);
		flex-direction: column;
		width: 100%;
		box-sizing: border-box;
		gap: var(--gap);
	}
	.input_v {
		display: flex;
		align-items: center;
		width: 100%;
		box-sizing: border-box;
		border-radius: var(--r);
		padding: 0 var(--gap);
	}
	/* .input_v:focus-within {
		outline: var(--c-text) 1px solid;
	} */

	h6 {
		margin: 0;
		padding: var(--gap) calc(var(--gap) * 2);
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
		caret-color: var(--c-main);
	}

	input::selection {
		background-color: var(--c-main);
		color: var(--c-bg);
	}
	input::placeholder {
		color: var(--c-text-2);
	}

	input:focus {
		outline: none;
	}
</style>
