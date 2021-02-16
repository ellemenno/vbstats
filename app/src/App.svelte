<script>
  import Recorder from "./Recorder.svelte";
  import Visualizer from "./Visualizer.svelte";
  import Tabs from "./Tabs.svelte";

  let items = [ // provide labels, values and assigned components
    { label: "Record",    value: 1, component: Recorder   },
    { label: "Visualize", value: 2, component: Visualizer },
  ];
</script>

<h1>vbstats</h1>

<Tabs {items} />