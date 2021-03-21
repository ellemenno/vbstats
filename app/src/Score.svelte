<script>
  import { logger } from './logger.js';

  export let current_set = 0;
  export let home_score = 0;
  export let home_sets = 0;
  export let away_score = 0;
  export let away_sets = 0;

</script>

<style>
  .home {
    background-color: var(--team-home-rgb);
  }
  .away {
    background-color: var(--team-away-rgb);
  }
  .score {
    font-size: xx-large;
  }
  .sets {
    font-size: small;
  }
  .set {
    font-size: medium;
    left: 50%;
    margin-left: 0.5em;
    position: absolute;
    top: -0.5em;
  }
  .scoreboard {
    column-gap: 0.5rem;
    display: grid;
    grid-template-columns: 35% 15% 15% 35%;
    position: relative;
  }
  .scoreboard .digits {
    height: 100%;
    position: relative;
    user-select: none;
  }
  .scoreboard .digits span {
    border-radius: 4px;
    bottom: 0;
    padding-top: 0.1em;
    position: absolute;
    text-align: center;
    width: 100%;
  }
</style>

<div class="scoreboard">
<div class="digits"><span class="home score">{home_score.toString().padStart(2,'0')}</span></div>
<div class="digits"><span class="home sets">{home_sets}</span></div>
<div class="set">{current_set}</div>
<div class="digits"><span class="away sets">{away_sets}</span></div>
<div class="digits"><span class="away score">{away_score.toString().padStart(2,'0')}</span></div>
</div>