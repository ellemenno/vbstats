# vbstats website

https://ellemenno.github.io/vbstats/


## development

to build and serve the site locally for development:

```console
$ npm run build:dev && npm run serve`
```

## publishing

this site is hosted via GitHub Pages from the [`gh-pages`][gh-pages] branch, tracked as a separate [git worktree] rooted at this directory.

to set up for publishing:
1. create a new Personal Access Token on GitHub ([instructions][pat howto])
   - _you only need to grant the `public_repo` privilege_
1. add an untracked config file to this directory (`/app/.env`):
   - `$ printf "DEPLOY_USER=uuu\nDEPLOY_TOKEN=ttt" > .env`
   - _(replace `uuu` and `ttt` with your username and personal access token)_
   - _`.env` should be kept out of source control to protect your secrets_
1. you should be set.
   - _try `npm run deploy` to build and publish the site into production._



[gh-pages]: https://github.com/ellemenno/vbstats/tree/gh-pages "branch for GitHub Pages auto-deployments"
[git worktree]: https://git-scm.com/docs/git-worktree "git command to manage multiple working trees"
[pat howto]: https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token "creating a personal access token"
[X1011]: https://github.com/X1011/git-directory-deploy "method for deploying a sub-directory of build files"