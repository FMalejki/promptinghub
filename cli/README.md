# promptinghub CLI

Install a prompt package from [PromptingHub](https://promptinghub-night-shift.vercel.app) into your project — like `gh repo clone`, but for prompts.

```bash
npx promptinghub add <owner>/<slug>
# e.g.
npx promptinghub add filipmalejki/distributed-systems-lab-7-agh-university
```

This fetches the prompt's install manifest from `…/api/p/<owner>/<slug>/manifest`
and writes every file in the package into `./<slug>/`.

### Options
- `--dir <path>` — base directory to install into (default: current directory)
- `--host <url>` — PromptingHub host (default: the public site, or `PROMPTINGHUB_HOST`)

### Status
The manifest API is live. Publishing this package to npm (so bare `npx promptinghub`
resolves) requires an npm account — run `npm publish` from this folder once logged in.
Until then you can run it directly: `node cli/index.js add owner/slug`.
