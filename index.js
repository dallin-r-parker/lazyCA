const childProcess = require('child_process');
const fs = require('fs');

// Get the options from the CLI and put them into an options object.
const getOptions = () => {
	const optKeys = ['-gh', '-gl', '-ct'];
	const getOptionValue = (option) => {
		const optionIndex = process.argv.indexOf(option);
		return optionIndex !== -1 ? `${process.argv[optionIndex + 1]}` : undefined;
	};

	return optKeys.reduce((acc, optKey) => {
		const formattedKey = optKey.substr(1); // Remove the leading '-' from the option.
		const optValue = getOptionValue(optKey);
		// Ultimately, this script will be stored in a scripts/ directory, one level below the Gitlab
		// repo's root level. If no Gitlab path option has been passed, set it to the default '../'.
		acc[formattedKey] = optKey === '-gl' && !optValue ? '../' : optValue;
		return acc;
	}, {});
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
				reject(Error(err));
			};
		});
	});
};
// Copy all of the necessary files into the local Gitlab repo.
const copyFiles = (gitlabPath) => {
	console.log(`Copying files to ${gitlabPath}`);

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

	const options = getOptions();
	pullGithubRepo(options.gh)
		.then(() => {
			copyFiles(options.gl)
		})
		.catch(err => console.error(err));
};

execute();
