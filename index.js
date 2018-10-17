const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const { sep, join } = path;
const gitlabPath = `..${sep}..${sep}`; // The path to the Gitlab repo should always be ../../
const consoleLog = message => console.log(message);
const consoleError = message => console.error(message);
const listDirContents = (path) => {
	return fs.readdirSync(path);
};
// Get the options from the CLI and put them into a config object.
// This behavior probably doesn't need to be handled with a promise, but I like
// that it allows the use of a single .catch() for the whole script.
const parseOptions = () => {
	consoleLog('Parsing command line options');

	const optKeys = ['-gh', '-ct']; // Possible option keys.
	const ctValues = [ 'content', 'solutions' ]; // Used to make sure user has passed a valid option for '-ct'.
	const getOptionValue = (option) => {
		const optionIndex = process.argv.indexOf(option);
		return optionIndex !== -1 ? `${process.argv[optionIndex + 1]}` : undefined;
	};

	return new Promise((resolve, reject) => {
		const defaultConfig = { 'gl': `..${sep}..${sep}` };
		const config = optKeys.reduce((acc, optKey) => {
			const optValue = getOptionValue(optKey);

			if ((optKey === '-gh' || optKey === '-ct') && !optValue ) {
				reject(Error(`Missing required key ${optKey}`));
			} else if (optKey === '-ct' && !ctValues.includes(optValue)) {
				reject(Error(`Ivalid value passed for ${optKey}; values must be 'content' or 'solution'.`));
			} else {
				const formattedKey = optKey.substr(1); // Remove the leading '-' from the option.
				acc[formattedKey] = optValue;

				return acc;
			}
		}, defaultConfig);

		resolve(config);
	});
};
// Using config.gh, cd into the local Github repo and pull.
const pullGithubRepo = (githubPath) => {
	consoleLog('Pulling from remote repo');

	return new Promise((resolve, reject) => {
		childProcess.exec(`cd ${githubPath} && git pull`, (error, stdout, stderr) => {
			if (stdout) {
				// Actually, need to watch out for various git errors here - for example,
				// rejecting a pull because of unsaved local changes...
				resolve();
			} else {
				const err = error !== null ? error : stderr;
				reject(Error(`Error pulling remote repo to ${githubPath}: ${err}`));
			};
		});
	});
};
// The directories in 01-Class-Content will have a two-digit leading numeric string.
// In order to decide which content we want to copy, first figure out which dir was added last.
const getMostRecentDirNumber = (dirs) => {
	const mostRecentDir = dirs.sort()[dirs.length - 1];
	return parseInt(mostRecentDir.substring(0, 2));
};
// Get the leading characters from the most recent copied directory.
const getLeadingTargetDirString = () => {
	const dirs = listDirContents(join(gitlabPath, '01-Class-Content'));
	const mostRecentDir = getMostRecentDirNumber(dirs);
	const incrementedMostRecentDir = `${mostRecentDir + 1}`; // Increment the directory lead by 1 and convert to string.
	return incrementedMostRecentDir.length === 1 ? `0${incrementedMostRecentDir}` : `${incrementedMostRecentDir}`; // Add a leading '0', if necessary.
};
const findDirToCopy = (githubPath, leadingTargetDirString) => {
	const dirs = listDirContents(join(githubPath, '01-Class-Content'));
	return dirs.find((dir) => {
		return dir.includes(leadingTargetDirString);
	});
};
// Copy all of the necessary files into the local Gitlab repo.
const copyFiles = (githubPath) => {
	const leadingTargetDirString = getLeadingTargetDirString();
	const dirToCopy = findDirToCopy(githubPath, leadingTargetDirString);

	consoleLog(`Copying files from ${dirToCopy} to ${gitlabPath}`);

	// TODO - need to figure out how to decide on the parts of the path.

	const sourcePath = join(githubPath, '01-Class-Content', dirToCopy);
	const newPath = join(gitlabPath, '01-Class-Content', '03-javascript');
	const targetPath = join(gitlabPath, '01-Class-Content');

	return new Promise((resolve, reject) => {
		fs.mkdir(newPath, { recursive: true }, (err) => {
			if (err) {
				reject(Error(err))
			} else {
				childProcess.exec(`cp -r ${sourcePath} ${targetPath}`, (error, stdout, stderr) => {
					if (error || stderr) {
						const err = error !== null ? error : stderr;
						reject(Error(`Error copying content from ${sourcePath} to ${targetPath}: ${err}`));			
					} else {
						resolve();
					};
				});
			};
		});
	});
};
// Based on the commitType - content or solutions - decide which lines of the .gitignore file
// to comment out or include.
const updateGitignore = (commitType) => {
	consoleLog('Updating .gitignore')

	return new Promise((resolve, reject) => {
		resolve();
	});
};
// Add and commit the changes to the local repo.
const makeLocalCommit = () => {
	consoleLog('Committing changes')

	return new Promise((resolve, reject) => {
		resolve();
	});
};
// We're all set, push the results up to Gitlab.
const pushGitlabRepo = () => {
	consoleLog('Pushing to remote repo')

	return new Promise((resolve, reject) => {
		resolve();
	});
}

const execute = () => {
	consoleLog('Starting');

	parseOptions()
	.then((config) => {
		const githubPath = config.gh;
		const commitType = config.ct;

		return pullGithubRepo(githubPath)
		.then(() => copyFiles(githubPath))
		.then(() => updateGitignore(commitType))
		.then(() => makeLocalCommit(commitType))
		.then(() => pushGitlabRepo())
		.then(() => console.log('Done!'))
	})
	.catch((error) => {
		consoleError(error);
	});
};

execute();
