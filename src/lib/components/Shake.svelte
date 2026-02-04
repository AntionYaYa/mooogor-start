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

	let isShaking = $state(false);
	let shakeDuration = $derived(`${duration}ms`);

	$effect(() => {
		if (shake) {
			isShaking = true;
			const timer = setTimeout(() => {
				isShaking = false;
				shake = false; // 重置shake状态
			}, duration);
			return () => clearTimeout(timer);
		}
	});
</script>

<div class="shake-wrapper" class:shaking={isShaking} style="--shake-duration: {shakeDuration}">
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
