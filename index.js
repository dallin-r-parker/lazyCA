const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const { sep, join } = path;

// Get the options from the CLI and put them into an options object.
const getOptions = () => {
	const optKeys = ['-gh', '-gl', '-ct']; // Possible option keys.
	const ctValues = [ 'content', 'solutions' ]; // Used to make sure user has passed a valid option for '-ct'.
	const getOptionValue = (option) => {
		const optionIndex = process.argv.indexOf(option);
		return optionIndex !== -1 ? `${process.argv[optionIndex + 1]}` : undefined;
	};

	return new Promise((resolve, reject) => {
		const optionMap = optKeys.reduce((acc, optKey) => {
			const optValue = getOptionValue(optKey);

			if ((optKey === '-gh' || optKey === '-ct') && !optValue ) {
				reject(Error(`Missing required key ${optKey}`));
			} else if (optKey === '-ct' && !ctValues.includes(optValue)) {
				reject(Error(`Ivalid value passed for ${optKey}; values must be 'content' or 'solution'.`));
			} else {
				const formattedKey = optKey.substr(1); // Remove the leading '-' from the option.
				
				// Ultimately, this script will be stored in a scripts/ directory, one level below the Gitlab
				// repo's root level. If no Gitlab path option has been passed, set it to the default '../'.
				acc[formattedKey] = optKey === '-gl' && !optValue ? `..${sep}` : optValue;
				return acc;
			}
		}, {});

		resolve(optionMap);
	});
};
// Using options.gh, cd into the local Github repo and pull.
const pullGithubRepo = (githubPath) => {
	return new Promise((resolve, reject) => {
		childProcess.exec(`cd ${githubPath} && git pull`, (error, stdout, stderr) => {
			console.log('Pulling from remote repo');

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
	console.log(`Copying files from ${githubPath} to ${gitlabPath}`);

	// Just an example to see the process at work - copy the README, for now...
	return new Promise((resolve, reject) => {
		fs.copyFile(join(githubPath, 'README.md'), join(gitlabPath, 'README.md'), (err) => {
			err ? reject(Error(`Error copying files from ${githubPath} to ${gitlabPath}: ${err}`)) : resolve()
		});
	});



	// Need to recursively copy all of the required directories.
	// See https://stackoverflow.com/questions/13786160/copy-folder-recursively-in-node-js
	// for a little guidance.

	// What are the directories that need to be copied?
	// How do they need to be renamed?
};
// Based on the commitType - content or solutions - decide which lines of the .gitignore file
// to comment out or include.
const updateGitignore = (commitType) => {

};
// We're all set, push the results up to Gitlab.
const pushGitlabRepo = (gitlabPath) => {

}

const execute = () => {
	console.log('Starting')

	getOptions()
	.then((options) => {
		return pullGithubRepo(options.gh)
		.then(() => {
			return copyFiles(options.gh, options.gl);
		})
		.then(() => {
			console.log('Done!');
		})
	})
	.catch((error) => {
		console.error(error);
	});
};

execute();
