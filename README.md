# vbstats

fast and simple stat recorder for volleyball games <br>
https://ellemenno.github.io/vbstats/


## quick overview

volleyball
- a _match_ is best 2 of 3 sets (3 of 5 not currently supported)
- a _set_ is a series of rallies until a team reaches 25 points (or 15 for final set) and wins by two
- a _rally_ is a sequence of ball contacts
- when the contact is with a human, the play continues
- when the contact is with the floor, the net, antenna, or some violation is called, play stops and a point is awarded

this app lets you record the contacts quickly, and then summarize stats for the match


## usage

1. upon loading the app, you may want to record the venue, date, and team names (this is optional)
   - the venue text field is at the top, you can enter any text
   - the date picker is at the top and defaults to the current day, but any day can be selected
   - team name text field are under the court on opposite sides of the score
     - the home team (blue) is considered 'your team', and will have player jerseys attributed to contacts
     - the away team (orange) will have anonymous contacts
1. click on the jersey icon next to the home team name to select the valid jersey numbers for your team
1. choose the serving team (home or away) to start recording
   - see details about recording in full court mode or speed court mode below
1. rallies and sets will be automatically scored based on the contacts you record


### full court mode

by default, the app starts in _full court_ mode, which shows a scale model of the volleyball court and allows you to record specific contact locations.
this can be useful when recording from video footage, where you have the option to pause and rewind the game, and enables review of player position in addition to stats.

after choosing the serving team,
- click in the service area for the starting team to place the first contact
  - if the contact is on your team's side, the contact agent menu will open to attribute a jersey number or the floor to the contact
- as play continues, click on the court where contact with the ball happens
  - you can click near the net for blocks, on the net or out of the court for errors
  - to record a violation, click the whistle to select which team was awarded a point

### speed court mode

by clicking on the lightning icon toggle, you can toggle to _speed court_ mode, which offers a simpler interface optimized for recording live play.

after choosing the serving team,
- if the home team is serving, click the jersey number of the serving player
- if the away team is serving, click the 1 button under touches (one touch for the serve)
- as play continues, use the buttons to record ball contacts:
  - _IN_ or _OUT_ on the appropriate side of the net when the ball touches the floor
  - _NET_ if the ball contacts the net
  - for home team contacts, click the jersey number of each player who contacts the ball in the order of touch
  - for away team contacts, simply click the button representing the total number of touches used to return the ball
  - use the _touches at net_ buttons to hint to the recorder when a block is possible
  - to record a violation, click the whistle to select which team was awarded a point


## stats

vbstats infers statistics based on the transcript of a recorded match and the rules of the game

### visualizations
- **match transcript**: short-hand record of all rallies, using color coded symbols for each contact
- **contribution**: points won, lost, and net contribution to match score by player
- **actions**: counts of contact types by player


## vocab & rules
> https://usavolleyball.org/resources-for-officials/rulebooks-and-interpretations/
> http://fs.ncaa.org/Docs/stats/Stats_Manuals/VB/2008%20VB%20Stats%20Manual%20easy%20print.pdf
> https://www.wiaawi.org/Portals/0/PDF/Sports/Volleyball/vbstatspresentation.pdf

to keep things simple, vbstats has a relatively small vocabulary and pays attention to a short list of contact types.

| term       | definition |
|------------|------------|
| Serving    | putting the ball into play at the start of a set and after each point |
| Receiving  | attempt to return the ball, using no more than 3 touches |
| Ace        | untouched or unreturnable serve that lands for a point |
| Pass       | body-level contact keeping the ball off the floor |
| Attack     | overhead contact of the ball designed to score |
| Kill       | unreturnable attack that lands for a point |
| Block Kill | attack stopped and returned at net that lands for a point |
| Assist     | pass to kill |
| Dig        | first contact with opponent's attack, including off a failed block |

### actions

- Serve
- Block
- Pass
- Attack

### effects

| pt | team       | effect     | description      |
|----|------------|------------|------------------|
| +1 | contacting | Ace        | only from Serves |
| +1 | contacting | Block Kill | only from Blocks |
| +1 | contacting | Kill       | only from Pass or Attack |
|  0 | contacting | Pass       | from any |
| +1 | opposing   | Error      | from any |

### contextual effects

| pt | team       | effect          | context    |
|----|------------|-----------------|------------|
|  0 | contacting | Dig             | first Pass |
|  0 | contacting | Assist          | Pass preceding Kill |
| +1 | opposing   | Service Error   | Error from Serve |
| +1 | opposing   | Attack Error    | Error from Attack |
| +1 | opposing   | Reception Error | Error from Block or Pass |


## court specs
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
