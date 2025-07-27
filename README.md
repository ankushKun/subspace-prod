# [Subspace](https://subspace.ar.io) <img src="./public/icon.png" alt="subspace-icon" height="20px"/>

## Installation

```bash
# Need to recursively install submodules or app wont build
git clone git@github.com:subspace-dev/app.git --recurse-submodules
```

### Included Submodules:

- [subspace-sdk](https://github.com/subspace-dev/sdk)
- [WAuth](https://github.com/subspace-dev/wauth)

### Setup pocketbase
required for WAuth, no need if you just want to use a window wallet

Download the pocketbase binary into [`wauth/backend/bin`](./wauth/backend/bin/) according to your platform \
Set the appropriate environment variables in [`wauth/backend/.env.template`](./wauth/backend/.env.template) and rename it to `.env`

- SU_EMAIL - pocketbase superuser email
- SU_PASS - pocketbase superuser password
- BOT_TOKEN - Discord bot token

### Install deps and build

You will need to have [bun](https://bun.com/) pre installed for this

```bash
bun run install:all
bun run build:all
```



