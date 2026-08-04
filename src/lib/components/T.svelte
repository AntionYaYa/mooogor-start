<script lang="ts">
	type syleType = "xl" | "l" | "m" | "s";
	type alignType = "c" | "r";
	interface Props {
		children: any;
		type?: syleType;
		bold?: boolean;
		nowrap?: boolean;
		color?: string;
		align?: alignType;
		strike?: boolean;
	}
	let { children, type = "m", bold, nowrap, color, align, strike }: Props = $props();
</script>

<p
	class="{type} {bold ? 'bold' : ''} {nowrap ? 'nowrap' : ''} {strike ? 'strike' : ''}"
	style="color: {color}; text-align: {align === 'c' ? 'center' : align === 'r' ?'right': 'left'}"
>
	{@render children()}
</p>

<style>
	p {
		margin: 0;
		padding: calc(var(--gap) / 2) var(--gap);
		width: 100%;
		border-radius: var(--r);
		box-sizing: border-box;
		overflow: hidden;
		text-overflow: ellipsis;
		word-break: break-word;
	}
	::selection{
      background-color: var(--c-green);
      color: var(--c-bg);
    }
	.nowrap {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}
	.xl {
		color: var(--c-text);
		font-size: var(--f-size-el);
	}
	.l {
		color: var(--c-text);
		font-size: var(--f-size-l);
	}
	.m {
		color: var(--c-text);
		font-size: var(--f-size-m);
	}
	.s {
		color: var(--c-text-1);
		font-size: var(--f-size-s);
	}
	.bold {
		font-weight: var(--f-bold);
	}
	.strike {
		text-decoration: line-through;
	}
</style>
