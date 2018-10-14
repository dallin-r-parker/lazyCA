const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const { sep, join } = path;

const consoleLog = message => console.log(message);
const consoleError = message => console.error(message);
// Get the options from the CLI and put them into a config object.
const parseOptions = () => {
	consoleLog('Parsing command line options');

	const optKeys = ['-gh', '-ct']; // Possible option keys.
	const ctValues = [ 'content', 'solutions' ]; // Used to make sure user has passed a valid option for '-ct'.
	const getOptionValue = (option) => {
		const optionIndex = process.argv.indexOf(option);
		return optionIndex !== -1 ? `${process.argv[optionIndex + 1]}` : undefined;
	};

	return new Promise((resolve, reject) => {
		const defaultConfig = { 'gl': `..${sep}..${sep}` }; // By default, we'll set the config for 'gl' to '../../' (path to the root of the Gitlab repo).
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
// Copy all of the necessary files into the local Gitlab repo.
const copyFiles = (githubPath, gitlabPath) => {
	consoleLog(`Copying files from ${githubPath} to ${gitlabPath}`);

	const sourcePath = join(githubPath, '01-Class-Content', '03-javascript');
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
						reject(Error(`Error copying content from ${targetPath} to ${sourcePath}: ${err}`));			
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

};
// We're all set, push the results up to Gitlab.
const pushGitlabRepo = (gitlabPath) => {

}

const execute = () => {
	consoleLog('Starting');

	parseOptions()
	.then((config) => {
		return pullGithubRepo(config.gh)
		.then(() => {
			return copyFiles(config.gh, config.gl);
		})
		.then(() => {
			consoleLog('Done!');
		})
	})
	.catch((error) => {
		consoleError(error);
	});
};

execute();
