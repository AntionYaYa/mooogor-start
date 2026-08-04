<script lang="ts">
	interface Props {
		children: any;
		shake?: boolean;
		duration?: number;
	}

	let {
		children,
		shake = $bindable(false),
		duration = 800,
	}: Props = $props();

	let shakeDuration = $derived(`${duration}ms`);
</script>

<div
	class="shake-wrapper"
	class:shaking={shake}
	style="--shake-duration: {shakeDuration}"
	onanimationend={() => (shake = false)}
>
	{@render children()}
</div>

<style>
	.shake-wrapper {
		display: inline-block;
		width: 100%;
	}

	.shake-wrapper.shaking {
		animation: shake var(--shake-duration, 0.5s) ease-in-out;
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		10%,
		30%,
		50%,
		70%,
		90% {
			transform: translateX(-10px);
		}
		20%,
		40%,
		60%,
		80% {
			transform: translateX(10px);
		}
	}
</style>
