# vbstats website

https://ellemenno.github.io/vbstats/


## publishing

this site is hosted via GitHub Pages from the [`gh-pages`](/ellemenno/vbstats/tree/gh-pages/) branch, tracked as a separate [git worktree](https://git-scm.com/docs/git-worktree), as modeled by [X1011/git-directory-deploy](/X1011/git-directory-deploy) (see [`scripts/deploy`](scripts/deploy)).

to set up for publishing:
1. create an `.env` file in this directory (`/app/.env`): `$ printf "DEPLOY_USER=xxx\nDEPLOY_TOKEN=xxx" > .env`
1. create a new Personal Access Token on GitHub ([instructions]](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token))
  - you only need to grant the `public_repo` privilege
1. edit the `.env` file to replace the `xxx`s with your username and token
1. you should be set. try `npm run deploy` to build and publish.
