# vbstats

fast and simple stat recorder for volleyball games

## quick overview

volleyball
- a _match_ is best 2 of 3 sets
- a _set_ is a series of rallies until a team reaches 25 points and wins by two
- a _rally_ is a sequence of ball contacts
- when the contact is with a human, the play continues
- when the contact is with the floor, the net, antenna, or some violation is called, play stops and a point is awarded

this app lets you record the contacts quickly, and then summarize stats for the match


## usage

1. click _New Match_ to start
1. enter date and team names
  - the first team entered will be considered 'your team', and will have players attributed to contacts; the opposing team will have anonymous contacts
1. click on the bench to enter player jersey numbers for your team, and also names if desired
1. click in the service area for the starting team to place the first contact
  - if the contact is on your team's side, the contact agent menu will open to attribute a player or the floor to the contact
1. as play continues, click on the court where contact with the ball happens
  - you can click near the net for blocks, on the net or out of the court for errors
  - to record an ace or kill on the opposing team's side, click and hold when placing the contact to open the agent menu and select floor
  - to record a violation, click the whistle and attribute a team or player


## stats

vbstats reads the transcript of a recorded match and infers statistics based on the rules of the game and the following formulas:

Receiving
- Reception Error - failed pass leading to point for other team (i.e. out, net, antenna, block, violation)
- Reception Percentage - digs minus reception errors, divided by total passes
- Assist Percentage - assists minus reception errors, divided by total passes
Attacking
- Attack Error - failed attack leading to point for other team (i.e. out, net, antenna, block, violation)
- Attack Percentage - kills minus attack errors, divided by total attacks (e.g., 10 kills - 2 errors / 16 total attacks = 8/16 = .500
Blocking
- Block Error - failed block leading to point for other team (i.e. out, net, re-block, violation)
- Block Percentage - blocks minus block errors, divided by total block attempts
Serving
- Service Error - failed serve leading to point for other team (i.e. out, net, antenna, block, violation)
- Service Percentage - aces minus service errors, divided by total serves


## visualizations
- shorthand summary: match transcript using color coded jersey numbers for each contact (green=ace/kill, blue=pass, red=error), and R for opposing team volleys
- counts: Points earned, Points lost, Digs, Assists
- stacked over/under bar chart: \[(Passes, Digs, Assists) vs (Reception errors)\], \[(Attacks, Kills) vs (Attack errors)\], \[(Block attempts, Blocks) vs (Block errors)\], \[(Serves, Aces) vs (Service errors)\]
- spiderchart: (Reception percentage, Attack percentage, Block percentage, Service percentage)


## vocab & rules
> https://usavolleyball.org/resources-for-officials/rulebooks-and-interpretations/

to keep things simple, vbstats has a relatively small vocabulary and pays attention to a short list of contact types.

Serve - putting the ball into play at the start of a set and after each point
Receive - attempt to return the ball, using no more than 3 touches
Ace - untouched or unreturnable serve that lands for a point
Block - attack stopped and returned at net that lands for a point
Pass - body-level contact keeping the ball off the floor
Attack - overhead contact of the ball designed to score
Kill - unreturnable attack that lands for a point
Assist - pass to kill
Dig - first contact with opponent's attack, including off a failed block

### actions

- Serve
- Block
- Pass
- Attack

### effects

- +1 Ace (only from Serves)
- +1 Block (only from Blocks)
- +1 Kill (only from Pass, or Attack)
-  0 Volley (from any)
- -1 Error (from any)

### contextual effects
-  0 Dig = first Pass
-  0 Assist = Pass preceding Kill
- -1 Service Error = Error following Serve
- -1 Attack Error = Error following Attack
- -1 Reception Error = Error following Block or Pass

### court
- 18m x 9m + 3m free zone + 6m service area at court ends
- each side is a 9m x 9m square
- attack line is 3m from net; remaining 6m is back court
- ball is 65 - 67cm

```
:```:``````````````````````````:```:
:   :  .--------------------.  :   :
:   :  |     :   ||   :     |  :   :
:   :  |     :   ||   :     |  :   :
:   :  |     :   ||   :     |  :   :
:   :  '--------------------'  :   :
:...:..........................:...:
```
