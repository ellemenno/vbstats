<script>
  import { onMount } from 'svelte';
  import { Tab, Tabs } from 'svelte-mui';

  import { logger } from './logger.js';
  import HeaderBar from "./HeaderBar.svelte";
  import Recorder from "./Recorder.svelte";
  import Visualizer from "./Visualizer.svelte";
  import DataInterface from "./DataInterface.svelte";

  export let version;

  const log = logger('app: ');

  const prefers_dark = () => (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggle_theme = (palette) => {
    log.info('toggling theme');
    const d = document.documentElement;
    if (d.attributes.getNamedItem('style')) { d.removeAttribute('style'); }
    else { Object.keys(palette).map(k => d.style.setProperty(k, palette[k])); }
  }

  const dark_theme = {
    '--bg-color': '#303134',
    '--color': '#eee',
    '--alternate': '#aaa',
    '--primary': '#91c1c7',
    '--focus-color': '#91c1c77f', // primary at 50% opacity
    '--accent': '#ebc599',
    '--bg-popover': '#3f3f3f',
    '--bg-panel': '#434343',
    '--bg-app-bar': '#838383',
    '--border': '#555',
    '--bg-input-filled': '#ffffff0d', // 05%
    '--divider': '#ffffff2d',         // 18%
    '--label': '#ffffff7f',           // 50%
  };

  onMount(async () => {
    if (prefers_dark()) { toggle_theme(dark_theme) }
  });
</script>


<HeaderBar title="vbstats" {version} /><br/><br/>

<Tabs tabNames={['game', 'stats', 'data']}>
  <Tab><Recorder/></Tab>
  <Tab><Visualizer/></Tab>
  <Tab><DataInterface/></Tab>
</Tabs>
