<script>
  import { onMount } from 'svelte';
  import { Tab, Tabs } from 'svelte-mui';

  import { logger } from './logger.js';
  import HeaderBar from "./HeaderBar.svelte";
  import Recorder from "./Recorder.svelte";
  import Visualizer from "./Visualizer.svelte";
  import DataInterface from "./DataInterface.svelte";

  const log = logger('app: ');

  const prefers_dark = () => (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggle_theme = (palette) => {
    log.info('toggling theme');
    const d = document.documentElement;
    if (d.attributes.getNamedItem('style')) { d.removeAttribute('style'); }
    else { Object.keys(palette).map(k => d.style.setProperty(k, palette[k])); }
  }

  const dark_theme = {
    '--accent': '#ff6fab',
    '--alternate': '#000',
    '--bg-app-bar': '#838383',
    '--bg-color': '#303134',
    '--bg-input-filled': 'rgba(255,255,255, 0.1)',
    '--bg-panel': '#434343',
    '--bg-popover': '#3f3f3f',
    '--border': '#555',
    '--color': '#eee',
    '--divider': 'rgba(255,255,255, 0.175)',
    '--focus-color': 'rgba(62,166,255, 0.5)', // primary with alpha
    '--label': 'rgba(255,255,255, 0.5)',
    '--primary': 'rgba(62,166,255, 1.0)',
  };

  onMount(async () => {
    if (prefers_dark()) { toggle_theme(dark_theme) }
  });
</script>


<HeaderBar title="vbstats"/><br/><br/>

<Tabs tabNames={['game', 'stats', 'data']}>
  <Tab><Recorder/></Tab>
  <Tab><Visualizer/></Tab>
  <Tab><DataInterface/></Tab>
</Tabs>
