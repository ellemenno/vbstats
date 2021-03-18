<script>
  export let title = 'untitled';
  export let version = '0.0.0';
</script>

<style>
  .header-bar {
    align-items: center;
    background: var(--bg-panel);
    color: var(--accent);
    display: flex;
    font-size: 1em;
    height: 2.25em;
    left: 0;
    line-height: 1;
    min-width: inherit;
    padding: 0 4px 0 6px;
    position: fixed;
    right: 0;
    top: 0;
    z-index: 20;
  }
  .title {
    flex: 1;
    margin-left: 0.5rem;
  }
  .version {
    font-size: 80%;
    opacity: 70%;
  }
</style>

<div class="header-bar">
  <div class="title">{title} <span class="version">v{version}</span></div>
</div>
