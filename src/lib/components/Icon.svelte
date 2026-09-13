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
		Group,
		ChevronLeft,
		Rows3,
		GripHorizontal,
		RotateCcw,
		Minus,
		SquarePen,
		Folder,
		FolderOpen,
		Trash2,
		BrushCleaning,
		Info,
		TriangleAlert,
		Coffee,
		Search,
		QrCode,
		Globe,
		Bolt,
		Sparkles,
		Shuffle,
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
		| "Group"
		| "PlayingCardsFan"
		| "Rows3"
		| "GripHorizontal"
		| "RotateCcw"
		| "Minus"
		| "SquarePen"
		| "Folder"
		| "FolderOpen"
		| "Trash2"
		| "BrushCleaning"
		| "Info"
		| "TriangleAlert"
		| "Search"
		| "QrCode"
		| "Globe"
		| "Bolt"
		| "Sparkles"
		| "Shuffle"
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
	{#if name === "Group"}
		<Group {size} {strokeWidth} />
	{/if}
	{#if name === "PlayingCardsFan"}
		<!-- Lucide playing-cards-fan, ISC license; not yet in the installed package. -->
		<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M12.65 7.65a2 2 0 012.629-1.046l5.51 2.374a2 2 0 011.046 2.628l-3.957 9.184a2 2 0 01-2.628 1.046l-5.51-2.374a2 2 0 01-1.046-2.628z" />
			<path d="M18 7.777V4a2 2 0 00-2-2h-6a2 2 0 00-2 2v10a2 2 0 001.137 1.805" />
			<path d="m8 4.389-4.364.809a2 2 0 00-1.602 2.33l1.822 9.833a2 2 0 002.331 1.602l2.542-.47" />
		</svg>
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
	{#if name === "BrushCleaning"}
		<BrushCleaning {size} {strokeWidth} />
	{/if}
	{#if name === "Info"}
		<Info {size} {strokeWidth} />
	{/if}
	{#if name === "TriangleAlert"}
		<TriangleAlert {size} {strokeWidth} />
	{/if}
	{#if name === "Coffee"}
		<Coffee {size} {strokeWidth} />
	{/if}
	{#if name === "Search"}
		<Search {size} {strokeWidth} />
	{/if}
	{#if name === "QrCode"}
		<QrCode {size} {strokeWidth} />
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
	{#if name === "Shuffle"}
		<Shuffle {size} {strokeWidth} />
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
