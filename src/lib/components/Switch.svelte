<script lang="ts">
	interface Props {
		turnOn: boolean;
		onSwitch: (swith: boolean) => void;
	}
	let { turnOn, onSwitch }: Props = $props();
</script>

<button title="switch" class="outside" onclick={() => onSwitch(!turnOn)}>
	<div class="ball {turnOn ? 'ball_on' : 'ball_off'}"></div>
</button>

<style>
	.outside {
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
	.outside:active{
		background-color: var(--c-mask);
    transform: translateY(2px);
    transition: all 0.1s ease-out;
	}
	.ball {
		width: 20px;
		min-width: 20px;
		height: 16px;
		min-height: 16px;
		border-radius: 100px;
		margin: 2px;
		position: absolute;
		top:0;
		transition: all ease-out 0.1s;
	}
	.ball_on {
		left: 12px;
		background-color: var(--c-green);
	}
	.ball_off {
		left: 0;
		background-color: var(--c-text-2);
	}
</style>
