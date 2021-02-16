<script>
  import { onMount } from 'svelte';

  let svg;

  const handleClick = (e) => {
    const click_loc = screen_to_svg(svg, e.clientX, e.clientY);
    console.log(`clicked at [${click_loc.x}, ${click_loc.y}]`);
  }

  const screen_to_svg = (svg, x, y) => {
    const svgpt = svg.createSVGPoint();
    svgpt.x = x;
    svgpt.y = y;
    return svgpt.matrixTransform(svg.getScreenCTM().inverse());
  }

  onMount(async () => {
    svg = document.getElementById('play-area');
  });
</script>

<style>
  svg {
    width: 100%;
    height: 100%;
  }
  line.boundary {
    stroke: white;
    stroke-width: 0.05;
    stroke-linecap: butt;
    stroke-linejoin: miter;
    fill: none;
  }
  line.extension {
    stroke-dasharray: 0.15,0.20;
  }
  rect.free {
    fill: #0c7bdc;
  }
  rect.court {
    fill: #d8b13c;
  }
  circle.post{
    fill: white;
    stroke: none;
  }
</style>

<h1>record a match</h1>

<svg id="play-area" on:click={handleClick} viewBox="3 1.5 24 12"> <!-- zoom in on court; full image is 30 x 15 -->
  <rect class="free" width="30" height="15" rx="1" />
  <rect class="court" width="18" height="9" x="6" y="3" />
  <line class="court boundary" x1="6" y1="3" x2="24" y2="3" />
  <line class="court boundary" x1="24" y1="3" x2="24" y2="12" />
  <line class="court boundary" x1="24" y1="12" x2="6" y2="12" />
  <line class="court boundary" x1="6" y1="12" x2="6" y2="3" />
  <line class="court boundary" x1="12" y1="3" x2="12" y2="12" />
  <line class="court boundary" x1="15" y1="3" x2="15" y2="12" />
  <line class="court boundary" x1="18" y1="3" x2="18" y2="12" />
  <circle class="post" cx="15" cy="2" r="0.1012"/> <!-- 3" (7.62cm) post w/ 1.25cm padding around it, set 1m outside court -->
  <circle class="post" cx="15" cy="13" r="0.1012"/>
  <line class="boundary extension" x1="6" y1="3" x2="4.25" y2="3" />
  <line class="boundary extension" x1="24" y1="3" x2="25.75" y2="3" />
  <line class="boundary extension" x1="6" y1="12" x2="4.25" y2="12" />
  <line class="boundary extension" x1="24" y1="12" x2="25.75" y2="12" />
  <line class="boundary extension" x1="12" y1="3" x2="12" y2="1.25" />
  <line class="boundary extension" x1="18" y1="3" x2="18" y2="1.25" />
  <line class="boundary extension" x1="12" y1="12" x2="12" y2="13.75" />
  <line class="boundary extension" x1="18" y1="12" x2="18" y2="13.75" />
</svg>