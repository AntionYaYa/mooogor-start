import { mount } from 'svelte';
import App from './App.svelte';
import '../../lib/style/base.css';
import '../../lib/style/color.css';

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
