---
name: app-screenshots
description: >
  Take or retake the desktop app's screenshots in docs/screenshots, which the README and the
  marketing site's front page show. Use whenever the user asks to take, update, retake or refresh
  screenshots of the app, the README's or the site's images, or to add a new screenshot; and
  after any change that alters what a screenshot shows (theme, colours, fonts, layout, the
  header, the settings drawer, wording on screen), even if the user doesn't mention screenshots.
---

# The app's screenshots

`docs/screenshots/*.png` are taken from the app's own front end, not drawn. One command takes
them all:

```sh
pnpm --filter desktop screenshots              # every scene
pnpm --filter desktop screenshots settings     # only the scenes named
```

They're the app window's default size (`tauri.conf.json`) at 150%, as on a Windows laptop, with
the app's own title bar.

## How it works

1. **Serving.** `apps/desktop/screenshots/shoot.ts` serves the desktop front end with Vite, with
   `screenshots/api.ts` in place of `src/api.ts`, `screenshots/appWindow.ts` in place of
   `src/appWindow.ts`, and `screenshots/tauri.ts` in place of the `@tauri-apps/*` modules.
   `screenshots/main.tsx` types the sample input before the app starts.
2. **Answering.** `screenshots/api.ts` answers as the core would: settings, and a run's events.
   It starts out replaying the sample run in `src/__fixtures__/run.ts`. Once the app does real
   work, record a real run instead: a small example in the core (`cargo run --release -p
   <core> --example record`) that does a run, through `http::Http` like the app, and writes its
   events and files to `target/screenshots`; `shoot.ts` runs it when there's no recording yet,
   and `api.ts` answers from it. Files the run saves stay in `target/`, never in the repo.
3. **Shooting.** For each scene and colour mode it starts the run, waits for **Finished**, does
   the scene's action, parks the mouse out of the way and saves
   `docs/screenshots/<scene>-<mode>.png`.

## The scenes

| File                   | Shows                                  | Used by                         |
| ---------------------- | -------------------------------------- | ------------------------------- |
| `results-{light,dark}` | A finished run of the sample names     | README's top; the site's front  |
| `settings-dark`        | The settings drawer, open              | README, "Using it"              |

`SCENES` in `shoot.ts` is the list.

## Retaking them

1. Run `pnpm --filter desktop screenshots`.
2. **Look at every image you took** with the Read tool before calling it done, against the one
   in git (`git show HEAD:docs/screenshots/<file> > <scratchpad>/old.png`). Look for: something
   that didn't load, a hovered or focused control that shouldn't be, text cut off, a palette or
   font that isn't the theme's (a half-applied change, or another edit landing mid-run), and the
   change you made actually showing.
3. If a shot's content changed, check its alt text in `README.md` still describes it, and
   `apps/site/src/components/Screenshot.tsx` for the site's.
4. Commit the images with the change that made them differ, or on their own as
   `docs: retake the app's screenshots`.

When a scene fails, the error names the step: a selector that no longer matches means the UI's
labels changed, so update the scene's action in `shoot.ts`. `pageerror` lines are the app's own
errors, often a stand-in that no longer answers what the app asks: `api.ts` is typed as the real
`api`, so `pnpm typecheck` points at it.

## Adding a scene

1. Add it to `SCENES` in `shoot.ts`: a `name`, its colour `schemes`, and an `act` that gets the
   app into the state to show, with role- or label-based locators as in the Storybook stories.
   End with nothing hovered or focused that the picture isn't about.
2. If it needs data the stand-in doesn't have, answer it in `screenshots/api.ts`.
3. Take it, look at it, and put it in the README with alt text that says what it shows.
