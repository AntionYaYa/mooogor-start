import { mount } from 'svelte';
import { resolvePublicAssetUrl } from '@/lib/utils/assetUrl';
import { loadSettings, loadAutoFocusSearchSetting } from '@/lib/utils/settings';
import { applyTheme } from '@/lib/utils/theme';
import '../../lib/style/base.css';
import '../../lib/style/color.css';

async function bootstrap() {
  const currentUrl = new URL(window.location.href);
  const explicitFocusRequested =
    currentUrl.searchParams.get('focus') === 'search';
  const startupSettings = await loadSettings().catch(() => null);
  const autoFocusEnabled = explicitFocusRequested ||
    (startupSettings?.autoFocusSearch ?? await loadAutoFocusSearchSetting());

  if (autoFocusEnabled && !explicitFocusRequested) {
    const explicitNewTabUrl = new URL(resolvePublicAssetUrl('newtab.html'));
    explicitNewTabUrl.searchParams.set('focus', 'search');
    window.location.replace(explicitNewTabUrl.href);
    return undefined;
  }

  if (startupSettings) applyTheme(startupSettings.theme);
  const { default: App } = await import('./App.svelte');
  return mount(App, {
      target: document.getElementById('app')!,
      props: { startupSettings },
    });
}

const app = bootstrap();

export default app;
