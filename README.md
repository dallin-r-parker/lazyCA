# lazyCA

The script is written with the intention of simplifying the "Github pull -> copy selected files -> Gitlab" push process.

## Requirements

This script requires that you are running at least Node version `10.12.0` - the `{ recursive: true }` option in the call to `fs.mkdir` requires it.

## Use

### File structure

**lazyCA** should be placed in a root-level `scripts/` directory - the overall file structure should look like:

```
- COLNYC201809FSF2/
	- .gitignore
	- 01-Class-Content/
	- scripts/
		- lazyCA/
```

Replicate this file structure when testing locally, though the top-level directory does not need to be named 'COLNYC201809FSF2'.

### .gitignore

The .gitignore file in the root directory will be modified by this script. However, the basic contents of the file should be:

```
# Static content
##################################################################
**/gradingRubrics/*

# Dynamic content
##################################################################

# Ignore directories with 'Solutions' or 'Solved' in the file path
**/Solutions/*
**/Solved/*

# Ignore solution files
solved
```

### Run it

To run the script, use the command `node index.js` and provide values for the `-gh` and `-c` options -
- `-gh` is the absolute file path to your local clone of the Github repo.
- `-ct` is shorthand for 'commit type', and takes either `content` or `solutions`, depending on the kind of material that's to be committed and pushed.

For example

```bash
node index.js -gh /Users/darrenklein/Desktop/FullStack-Lesson-Plans -ct content
```

## Helpful git commands

- `git ls-files --others --exclude-standard` - list all untracked files and files in untracked directories.

