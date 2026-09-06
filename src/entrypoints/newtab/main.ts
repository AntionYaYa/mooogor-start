import { mount } from 'svelte';
import App from './App.svelte';
import { resolvePublicAssetUrl } from '@/lib/utils/assetUrl';
import { loadAutoFocusSearchSetting } from '@/lib/utils/settings';
import '../../lib/style/base.css';
import '../../lib/style/color.css';

async function bootstrap() {
  const currentUrl = new URL(window.location.href);
  const explicitFocusRequested =
    currentUrl.searchParams.get('focus') === 'search';
  const autoFocusEnabled = explicitFocusRequested
    ? true
    : await loadAutoFocusSearchSetting();

  if (autoFocusEnabled && !explicitFocusRequested) {
    const explicitNewTabUrl = new URL(resolvePublicAssetUrl('newtab.html'));
    explicitNewTabUrl.searchParams.set('focus', 'search');
    window.location.replace(explicitNewTabUrl.href);
    return undefined;
  }

  return mount(App, {
      target: document.getElementById('app')!,
    });
}

const app = bootstrap();

export default app;
