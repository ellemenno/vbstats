<script>
  import { Button, ButtonGroup, Icon } from 'svelte-mui';

  import { match } from './stores.js';
  import { logger } from './logger.js';
  import download_for_offline from './icons/download_for_offline.svg'
  import upload_file from './icons/upload_file.svg'

  const log = logger('data_interface: ');

  const file_name_from_match = (match) => 'match_data.json'

  const save_json_file = (name, data) => {
    const blob = new Blob([data], { type: "text/json" });
    const link = document.createElement("a");
    const click_event = new MouseEvent("click", {
        view: window,
        bubbles: true,
        cancelable: true,
    });

    link.download = name;
    link.href = window.URL.createObjectURL(blob);
    link.dataset.downloadurl = ["text/json", link.download, link.href].join(":");
    link.dispatchEvent(click_event);
    link.remove();
  };

  const on_upload = (e) => {
    log.debug('upload requested', e);
    let file = e.target.files[0];
    let reader = new FileReader();
    reader.onload = (e => $match = JSON.parse(e.target.result));
    reader.readAsText(file);
  }

  const on_download = (e) => {
    log.debug('download requested');
    save_json_file(file_name_from_match($match), match_data);
  }

  $: match_data = JSON.stringify($match, null, 2);
  let file_input;
</script>

<style>
  .panel {
    background: var(--bg-panel);
    display: inline-block;
    width: 100%;
  }
  .toolbar {
    display: flex;
    align-items: center;
    height: 48px;
    padding: 0 8px 0 16px;
    color: var(--label);
    background: var(--bg-panel);
  }
  textarea {
    background-color: var(--bg-input-filled);
    border-radius: 4px 4px 0 0;
    border: none;
    box-sizing: border-box;
    caret-color: var(--primary);
    color: var(--color);
    font-family: var(--code-font-family);
    margin: 0;
    max-height: 60vh;
    max-width: 100%;
    min-height: 60vh;
    min-width: 100%;
    outline: none;
    padding: 2px 0 0;
    text-align: left;
  }
</style>

<h2 style="max-width: 40%">import / export</h2>

<div class="panel">
  <div class="toolbar">
    <ButtonGroup color="primary">
      <Button outlined title="download this match data" on:click={on_download}>
        <Icon style="transform: scale(1.5);"><svelte:component this={download_for_offline} /></Icon>
      </Button>
      <Button outlined title="upload new match data" on:click={()=>file_input.click()}>
        <Icon style="transform: scale(1.5);"><svelte:component this={upload_file} /></Icon>
        <input style="display:none" type="file" accept=".json, .txt" bind:this={file_input} on:change={on_upload} />
      </Button>
    </ButtonGroup>
  </div>

  <textarea autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">{match_data}</textarea>
</div>
