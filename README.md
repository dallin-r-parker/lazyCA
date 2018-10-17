# lazyCA

The script is written with the intention of simplifying the "Github pull -> copy selected files -> Gitlab" push process.

## Requirements

This script requires that you are running at least Node version `10.12.0` - the `{ recursive: true }` option in the call to `fs.mkdir` requires it.

## Use

### File structure

**lazyCA** should be placed in a root-level `scripts/` directory - the overall file structure should look like:

```
- COLNYC201809FSF2/
	- 01-Class-Content/
	- scripts/
		- lazyCA/
```

Replicate this file structure when testing locally, though the top-level does not need to be named 'COLNYC201809FSF2'.

### Run it

To run the script, use the command `node index.js` and provide values for the `-gh` and `-c` options -
- `-gh` is the absolute file path to your local clone of the Github repo.
- `-ct` is shorthand for 'commit type', and takes either `content` or `solutions`, depending on the kind of material that's to be committed and pushed.

For example

```bash
node index.js -gh /Users/my_name/Documents/trilogy_ed/FullStack-Lesson-Plans -ct content
```

## Notes

A quick pseudo-code overview of the process...

- Script is started
	- In the command line, provide arguments for the file paths of the Github and Gitlab repos.
	- We need the script to handle Saturdays differently than Thursdays, since Saturday pushes up everything except the solutions. Will people reliably run this script those days, or should we include a 'day' argument in the command line options (or otherwise specify which type of operation this is going to be)?

- Github repo is pulled.

- Copy all files for the week into the local Gitlab repo.

- Depending on the day, comment/uncomment lines in the Gitlab .gitignore file, add and commit the changes, and push up the repo.
