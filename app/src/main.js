import './global.css';
import App from './App.svelte';

const app = new App({
	target: document.body,
	props: {
    version: '1.0.3',
	}
});

export default app;