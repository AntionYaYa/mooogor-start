<script lang="ts">
	import { t } from "@/lib/utils/i18n";
	interface Props {
		turnOn: boolean;
		disabled?: boolean;
		onclick?: () => void;
		label?: string;
	}
	let { turnOn, disabled = false, onclick, label = t("nt_switch") }: Props = $props();
</script>

{#snippet thumb()}
	<span class="ball {turnOn ? 'ball_on' : 'ball_off'}"></span>
{/snippet}

{#if onclick}
	<button
		type="button"
		title={t("nt_switch")}
		class="outside"
		{disabled}
		{onclick}
		role="switch"
		aria-checked={turnOn}
		aria-label={label}
	>
		{@render thumb()}
	</button>
{:else}
	<span class="outside" class:disabled aria-hidden="true">
		{@render thumb()}
	</span>
{/if}

<style>
	.outside {
		display: inline-block;
		box-sizing: border-box;
		width: 40px;
		min-width: 40px;
		height: 24px;
		min-height: 24px;
		border-radius: 100px;
		position: relative;
		border: var(--border1);
		transition: ease-out 0.2s;
		padding: 0;
		margin: 0;
		background-color: unset;
	}
	.outside:disabled,
	.outside.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	button.outside:active {
		background-color: var(--c-mask);
	}
	.outside:focus-visible {
		outline: 2px solid var(--c-text);
		outline-offset: 2px;
	}
	.ball {
		width: 20px;
		min-width: 20px;
		height: 16px;
		min-height: 16px;
		border-radius: 100px;
		margin: 2px;
		position: absolute;
		top: 0;
		transition: all ease-out 0.1s;
	}
	.ball_on {
		left: 12px;
		background: linear-gradient(0deg, var(--c-main), var(--c-main-1));
	}
	.ball_off {
		left: 0;
		background: linear-gradient(0deg, var(--c-main), var(--c-main-1));
		filter: grayscale(1);
	}
</style>
