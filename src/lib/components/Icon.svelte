<script lang="ts">
	import { SquareDashed, Settings2,X,Plus,ChevronDown,ChevronUp,History,Bookmark,Sprout,Eye} from "@lucide/svelte";
	export type IconName = "Loading" | "SquareDashed" | "Settings2"|'X'|"Plus"|'ChevronDown'|'ChevronUp'|'History'|'Bookmark'|'Sprout'|'Eye';

	interface Props {
		name?: IconName;
		color: string;
		size?: number;
		opacity?: number;
	}
	let { name, color, size = 20, opacity = 1 }: Props = $props();
	const strokeWidth = 2.5;
</script>

<div style="opacity:{opacity}; color:{color}">
	{#if !name}
		<SquareDashed {size} {strokeWidth} />
	{/if}
	{#if name === "Settings2"}
		<Settings2 {size} {strokeWidth} />
	{/if}
	{#if name === "X"}
		<X {size} {strokeWidth} />
	{/if}
	{#if name === "Plus"}
		<Plus {size} {strokeWidth} />
	{/if}
	{#if name === "ChevronDown"}
		<ChevronDown {size} {strokeWidth} />
	{/if}
	{#if name === "ChevronUp"}
		<ChevronUp {size} {strokeWidth} />
	{/if}
	{#if name === "History"}
		<History {size} {strokeWidth} />
	{/if}
	{#if name === "Bookmark"}
		<Bookmark {size} {strokeWidth} />
	{/if}
	{#if name === "Sprout"}
		<Sprout {size} {strokeWidth} />
	{/if}
	{#if name === "Eye"}
		<Eye {size} {strokeWidth} />
	{/if}
	{#if name === "Loading"}
		<svg width="20" height="20" viewBox="0 0 20 20">
			<circle
				cx="10"
				cy="10"
				r="8"
				stroke={color}
				stroke-width="2"
				fill="none"
				stroke-dasharray="40 100"
			>
				<animateTransform
					attributeName="transform"
					type="rotate"
					from="0 10 10"
					to="360 10 10"
					dur="1s"
					repeatCount="indefinite"
				/>
			</circle>
		</svg>
	{/if}
</div>

<style>
	div {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--gap);
		border-radius: var(--r-100);
	}
</style>
