# pr\*ats

\*st

## Setup

```
git clone .
cd ./pr-stats
```

Go to your GitHub profile settings, and generate a personal access token for
this application. It needs the following permissions

```
read:audit_log
read:discussion
read:org
read:packages
read:repo_hook
repo
user
```

Copy the generated token into a `.env` file at the root of this repo

## Run

```
npm run fetch
npm run start
```

Browse to localhost:8080
