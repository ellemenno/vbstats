# vbstats website

https://ellemenno.github.io/vbstats/


## publishing

this site is hosted via GitHub Pages from the [`gh-pages`][gh-pages] branch, tracked as a separate [git worktree], as modeled by [X1011/git-directory-deploy][X1011] (see [`scripts/deploy`](scripts/deploy)).

to set up for publishing:
1. create a new Personal Access Token on GitHub ([instructions][pat howto])
   - you only need to grant the `public_repo` privilege
1. create a config file in this directory (`/app/.env`), replacing `uuu` and `ttt` with your username and personal access token:
   - `$ printf "DEPLOY_USER=uuu\nDEPLOY_TOKEN=ttt" > .env`
1. you should be set.
   - try `npm run deploy` to build and publish.



[gh-pages]: https://github.com/ellemenno/vbstats/tree/gh-pages "branch for GitHub Pages auto-deployments"
[git worktree]: https://git-scm.com/docs/git-worktree "git command to manage multiple working trees"
[pat howto]: https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token "creating a personal access token"
[X1011]: https://github.com/X1011/git-directory-deploy "method for deploying a sub-directory of build files"