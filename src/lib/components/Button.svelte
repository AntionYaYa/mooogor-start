<script lang="ts">
	import { onDestroy } from "svelte";

	type Align = "c" | "r";
	type R = "r_o" | "r1" | "r2" | "r3";
	type ButtonPointerEvent = PointerEvent & { currentTarget: HTMLButtonElement };

	interface Props {
		children: any;
		fill?: boolean;
		full?: boolean;
		sel?: boolean;
		outlined?: boolean;
		align?: Align;
		r?: R;
		bg?: string;
		skipTabFocus?: boolean;
		disabled?: boolean;
		title?: string;
		role?: "switch";
		"aria-label"?: string;
		"aria-checked"?: boolean;
		"aria-expanded"?: boolean;
		"aria-pressed"?: boolean;
		onclick?: (event: MouseEvent) => void;
	}

	let {
		children,
		fill = false,
		full = false,
		sel = false,
		outlined = false,
		onclick,
		skipTabFocus,
		align,
		r,
		disabled = false,
		bg,
		title,
		role,
		"aria-label": label,
		"aria-checked": checked,
		"aria-expanded": expanded,
		"aria-pressed": ariaPressed,
	}: Props = $props();

	let pressed = $state(false);
	let activePress: AbortController | undefined;

	function startPress(event: ButtonPointerEvent) {
		if (disabled || !event.isPrimary || event.button !== 0) return;

		const { currentTarget: button, pointerId, clientX, clientY } = event;
		activePress?.abort();
		const press = new AbortController();
		activePress = press;
		pressed = true;

		function clearOffset() {
			button.style.removeProperty("--press-x");
			button.style.removeProperty("--press-y");
		}

		function reset() {
			press.abort();
			activePress = undefined;
			pressed = false;
			clearOffset();
		}

		function endPress(release: PointerEvent) {
			if (release.pointerId === pointerId) reset();
		}

		clearOffset();
		const { signal } = press;
		window.addEventListener("pointermove", (move) => {
			if (move.pointerId !== pointerId) return;
			if (disabled || !(move.buttons & 1)) {
				reset();
				return;
			}
			const x = (move.clientX - clientX) * 0.2;
			const y = (move.clientY - clientY) * 0.2;
			const limit = Math.max(1, Math.hypot(x, y) / 3);
			button.style.setProperty("--press-x", `${x / limit}px`);
			button.style.setProperty("--press-y", `${y / limit}px`);
		}, { passive: true, signal });
		window.addEventListener("pointerup", endPress, { signal });
		window.addEventListener("pointercancel", endPress, { signal });
		window.addEventListener("blur", reset, { signal });
	}

	onDestroy(() => activePress?.abort());
</script>

<button
	class="btn {align} {r}"
	style:background-color={bg}
	class:fill
	class:full
	class:sel
	class:outlined
	class:pressed
	{onclick}
	onpointerdown={startPress}
	{disabled}
	{title}
	{role}
	aria-label={label}
	aria-checked={checked}
	aria-expanded={expanded}
	aria-pressed={ariaPressed}
	tabindex={skipTabFocus ? -1 : undefined}
>
	{@render children()}
</button>

<style>

	.btn {
		display: flex;
		border: none;
		border-radius: var(--r);
		background: none;
		padding: 0;
		transition: transform 160ms ease-out, background-color 100ms ease-out;
	}

	.btn:enabled:is(:active, .pressed) {
		transform: translate(var(--press-x, 0px), var(--press-y, 0px)) scale(1.035);
		transition-duration: 60ms, 100ms;
		background-color: var(--c-mask);
	}

	@media (prefers-reduced-motion: reduce) {
		.btn {
			transition: none;
		}
		.btn:enabled:is(:active, .pressed) {
			transform: none;
		}
	}

	.btn:focus-visible {
		outline: 2px solid var(--c-text);
	}

	.fill {
		background-color: var(--c-mask);
	}
	.btn.fill:enabled:is(:active, .pressed) {
		background-color: var(--c-mask1);
	}
	.full {
		width: 100%;
		box-sizing: border-box;
		min-width: 0;
	}
	.outlined {
		outline: 2px solid var(--c-mask);
	}
	.c {
		justify-content: center;
		align-content: center;
		align-items: center;
	}
	.r {
		justify-content: flex-end;
		align-content: flex-end;
		align-items: flex-end;
	}
	.r_o {
		border-radius: var(--r);
	}
	.r1 {
		border-radius: var(--r1);
	}
	.r2 {
		border-radius: var(--r2);
	}
	.r3 {
		border-radius: var(--r3);
	}
	.sel{
		outline: 2px solid var(--c-main);
		background-color: var(--c-main-3);
	}
</style>
