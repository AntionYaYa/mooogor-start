<script lang="ts">
	import {
		SquareDashed,
		Settings2,
		X,
		Plus,
		ChevronDown,
		ChevronUp,
		ChevronRight,
		History,
		Bookmark,
		Sprout,
		Eye,
		Check,
		ArrowUpRight,
		Grid2x2,
		ChevronLeft,
		Rows3,
		GripHorizontal,
		RotateCcw,
		Minus,
		SquarePen,
		Folder,
		FolderOpen,
		Trash2,
		Info,
		Coffee,
		Search,
		Globe,
		Bolt,
		Sparkles,
	} from "@lucide/svelte";
	export type IconName =
		| "Loading"
		| "SquareDashed"
		| "Settings2"
		| "X"
		| "Plus"
		| "ChevronDown"
		| "ChevronUp"
		| "ChevronLeft"
		| "ChevronRight"
		| "History"
		| "Bookmark"
		| "Sprout"
		| "Eye"
		| "Check"
		| "ArrowUpRight"
		| "Grid2x2"
		| "Rows3"
		| "GripHorizontal"
		| "RotateCcw"
		| "Minus"
		| "SquarePen"
		| "Folder"
		| "FolderOpen"
		| "Trash2"
		| "Info"
		| "Search"
		| "Globe"
		| "Bolt"
		| "Sparkles"
		| "Coffee";

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
	{#if name === "Check"}
		<Check {size} {strokeWidth} />
	{/if}
	{#if name === "ArrowUpRight"}
		<ArrowUpRight {size} {strokeWidth} />
	{/if}
	{#if name === "Grid2x2"}
		<Grid2x2 {size} {strokeWidth} />
	{/if}
	{#if name === "ChevronLeft"}
		<ChevronLeft {size} {strokeWidth} />
	{/if}
	{#if name === "Rows3"}
		<Rows3 {size} {strokeWidth} />
	{/if}
	{#if name === "ChevronRight"}
		<ChevronRight {size} {strokeWidth} />
	{/if}
	{#if name === "GripHorizontal"}
		<GripHorizontal {size} {strokeWidth} />
	{/if}
	{#if name === "RotateCcw"}
		<RotateCcw {size} {strokeWidth} />
	{/if}
	{#if name === "Minus"}
		<Minus {size} {strokeWidth} />
	{/if}
	{#if name === "SquarePen"}
		<SquarePen {size} {strokeWidth} />
	{/if}
	{#if name === "Folder"}
		<Folder {size} {strokeWidth} />
	{/if}
	{#if name === "FolderOpen"}
		<FolderOpen {size} {strokeWidth} />
	{/if}
	{#if name === "Trash2"}
		<Trash2 {size} {strokeWidth} />
	{/if}
	{#if name === "Info"}
		<Info {size} {strokeWidth} />
	{/if}
	{#if name === "Coffee"}
		<Coffee {size} {strokeWidth} />
	{/if}
	{#if name === "Search"}
		<Search {size} {strokeWidth} />
	{/if}
	{#if name === "Globe"}
		<Globe {size} {strokeWidth} />
	{/if}
	{#if name === "Bolt"}
		<Bolt {size} {strokeWidth} />
	{/if}
	{#if name === "Sparkles"}
		<Sparkles {size} {strokeWidth} />
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
		padding: calc(var(--gap) / 2);
		border-radius: var(--r-100);
	}
</style>
