<script>
  import Court from "./Court.svelte";

  const on_contact = (e) => {
    const {object, court_x, court_y} = e.detail;
    console.log(`contact with ${object} at [${court_x}, ${court_y}]`);
  }
</script>

<style>
</style>

<h1>record a match</h1>

<Court on:contact={on_contact}/>
