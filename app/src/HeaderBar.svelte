<script>
  export let title = 'untitled'
</script>

<style>
  .header-bar {
    align-items: center;
    background: var(--bg-app-bar);
    color: #fff;
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
</style>

<div class="header-bar">
  <div class="title">{title}</div>
</div>
