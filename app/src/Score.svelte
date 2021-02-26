<script>
  import { TEAM, ACTION } from './stores.js';
  import { match } from './stores.js';
  import { logger } from './logger.js';

  export let home_score = 0;
  export let home_sets = 0;
  export let away_score = 0;
  export let away_sets = 0;

</script>

<style>
  .home {
    background-color: rgb(var(--team-home-rgb));
  }
  .away {
    background-color: rgb(var(--team-away-rgb));
  }
  .score {
    font-size: xx-large;
  }
  .sets {
    font-size: small;
  }
  .scoreboard {
    column-gap: 0.5rem;
    display: grid;
    grid-template-columns: 35% 15% 15% 35%;
  }
  .scoreboard .digits {
    height: 100%;
    position: relative;
  }
  .scoreboard .digits span {
    bottom: 0;
    position: absolute;
    text-align: center;
    width: 100%;
  }
</style>

<div class="scoreboard">
<div class="digits"><span class="home score">{home_score.toString().padStart(2,'0')}</span></div>
<div class="digits"><span class="home sets">{home_sets}</span></div>
<div class="digits"><span class="away sets">{away_sets}</span></div>
<div class="digits"><span class="away score">{away_score.toString().padStart(2,'0')}</span></div>
</div>