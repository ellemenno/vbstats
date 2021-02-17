<script>
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let svg;
  let contact;

  const on_click = (e) => {
    const loc = screen_to_svg(svg, e.clientX, e.clientY);
    // console.log(`clicked ${e.target.getAttribute('id')} at [${loc.x}, ${loc.y}]`);
    dispatch('contact', {
      object: e.target.getAttribute('id'),
      court_x: loc.x,
      court_y: loc.y,
    });
  }

  const on_move = (e) => {
    const loc = screen_to_svg(svg, e.clientX, e.clientY);
    contact.setAttributeNS(null, 'cx', loc.x);
    contact.setAttributeNS(null, 'cy', loc.y);
  }

  const screen_to_svg = (svg, x, y) => {
    // transforms {x,y} in screen space (pixels), to coordinates in svg space (arbitrary units)
    const svgpt = svg.createSVGPoint();
    svgpt.x = x;
    svgpt.y = y;
    return svgpt.matrixTransform(svg.getScreenCTM().inverse());
  }

  onMount(async () => {
    svg = document.getElementById('play-area');
    contact = document.getElementById('contact');
    console.log('contact is: ', contact);
  });
</script>

<style>
  svg {
    width: 100%;
    height: 100%;
    cursor: none;
    /*cursor: crosshair;*/
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
  rect.area {
    fill: white;
    opacity: 0;
  }
  rect.area.block {
    opacity: 0.15;
  }
  rect.area.net {
    fill: black;
    opacity: 0.15;
  }
  rect.area:hover {
    opacity: .3;
  }
  g:hover rect.area {
    opacity: .3;
  }
  circle.post {
    fill: white;
    stroke: none;
  }
  circle.contact {
    fill: white;
    fill-opacity: .25;
    stroke: white;
    stroke-width: 0.05;
  }
</style>

<svg id="play-area" on:click={on_click} on:mousemove={on_move} viewBox="3 1.5 24 12"> <!-- zoom in on court; full image is 30 x 15 -->
  <rect class="free" width="30" height="15" rx="1" />
  <rect class="court" width="18" height="9" x="6" y="3" />

  <circle id="contact" class="contact" cx="15" cy="7.5" r="0.105"/> <!-- circumference is 65-67 cm, so radius is 10.5 cm -->

  <g>
    <rect   id="free-top-area" class="area" width="30" height="3" x="0" y="0" />
    <circle id="free-top-post" class="post" cx="15" cy="2" r="0.1012"/> <!-- 3" (7.62cm) post w/ 1.25cm padding around it, set 1m outside court -->
    <line   id="free-top-extA" class="boundary extension" x1="12" y1="3" x2="12" y2="1.25" />
    <line   id="free-top-extB" class="boundary extension" x1="18" y1="3" x2="18" y2="1.25" />
  </g>
  <g>
    <rect id="free-home-area" class="area" width="6" height="9" x="0" y="3" />
    <line id="free-home-extA" class="boundary extension" x1="6" y1="3" x2="4.25" y2="3" />
    <line id="free-home-extB" class="boundary extension" x1="6" y1="12" x2="4.25" y2="12" />
  </g>
  <g>
    <rect id="court-home-area"  class="area" width="7.8" height="9" x="6" y="3" />
    <line id="court-home-tapeA" class="court boundary" x1="15" y1="12" x2="6" y2="12" />
    <line id="court-home-tapeB" class="court boundary" x1="6" y1="12" x2="6" y2="3" />
    <line id="court-home-tapeC" class="court boundary" x1="6" y1="3" x2="15" y2="3" />
    <line id="court-home-tapeD" class="court boundary" x1="12" y1="3" x2="12" y2="12" />
  </g>
  <rect id="block-home-area" class="block area" width="0.8" height="9" x="13.8" y="3" />
  <g>
    <rect id="net-area" class="net area" width="0.8" height="9" x="14.6" y="3" />
    <line id="net-tape" class="court boundary" x1="15" y1="3" x2="15" y2="12" />
  </g>
  <rect id="block-away-area" class="block area" width="0.8" height="9" x="15.4" y="3" />
  <g>
    <rect id="court-away-area"  class="area" width="7.8" height="9" x="16.2" y="3" />
    <line id="court-away-tapeA" class="court boundary" x1="15" y1="3" x2="24" y2="3" />
    <line id="court-away-tapeB" class="court boundary" x1="24" y1="3" x2="24" y2="12" />
    <line id="court-away-tapeC" class="court boundary" x1="24" y1="12" x2="15" y2="12" />
    <line id="court-away-tapeD" class="court boundary" x1="18" y1="3" x2="18" y2="12" />
  </g>
  <g>
    <rect id="free-away-area" class="area" width="6" height="9" x="24" y="3" />
    <line id="free-away-extA" class="boundary extension" x1="24" y1="3" x2="25.75" y2="3" />
    <line id="free-away-extB" class="boundary extension" x1="24" y1="12" x2="25.75" y2="12" />
  </g>
  <g>
    <rect   id="free-bottom-area" class="area" width="30" height="3" x="0" y="12" />
    <circle id="free-bottom-post" class="post" cx="15" cy="13" r="0.1012"/>
    <line   id="free-bottom-extA" class="boundary extension" x1="12" y1="12" x2="12" y2="13.75" />
    <line   id="free-bottom-extB" class="boundary extension" x1="18" y1="12" x2="18" y2="13.75" />
  </g>

</svg>