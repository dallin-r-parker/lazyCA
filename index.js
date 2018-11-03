const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const { sep, join } = path;
const gitlabPath = `..${sep}..${sep}`; // The path to the Gitlab repo should always be ../../
const classContentDir = '01-Class-Content';
const consoleLog = message => console.log(message); /* eslint-disable-line no-console */
const consoleError = message => console.error(message); /* eslint-disable-line no-console */
const listDirContents = dirPath => fs.readdirSync(dirPath);
// Get the options from the CLI and put them into a config object.
// This behavior probably doesn't need to be handled with a promise, but I like
// that it allows the use of a single .catch() for the whole script.
const parseOptions = () => {
  consoleLog('Parsing command line options');

  const optKeys = ['-gh', '-ct']; // Valid option keys.
  const ctValues = ['content', 'solutions']; // Used to make sure user has passed a valid option for '-ct'.
  const getOptionValue = (option) => {
    const optionIndex = process.argv.indexOf(option);
    return optionIndex !== -1 ? `${process.argv[optionIndex + 1]}` : undefined;
  };

  return new Promise((resolve, reject) => {
    const defaultConfig = { gl: `..${sep}..${sep}` };
    const config = optKeys.reduce((acc, optKey) => {
      const optValue = getOptionValue(optKey);

      if ((optKey === '-gh' || optKey === '-ct') && !optValue) {
        reject(Error(`Missing required key ${optKey}`));
      } else if (optKey === '-ct' && !ctValues.includes(optValue)) {
        reject(Error(`Ivalid value passed for ${optKey}; values must be 'content' or 'solution'.`));
      }

      const formattedKey = optKey.substr(1); // Remove the leading '-' from the option.
      acc[formattedKey] = optValue;

      return acc;
    }, defaultConfig);

    resolve(config);
  });
};
// Using config.gh, cd into the local Github repo and pull.
const pullGithubRepo = (githubPath) => {
  consoleLog('Pulling from remote repo');

  return new Promise((resolve, reject) => {
    childProcess.exec(`(cd ${githubPath} && git pull origin master)`, (error, stdout, stderr) => {
      if (stdout) {
        // Actually, need to watch out for various git errors here - for example,
        // rejecting a pull because of unsaved local changes...
        resolve();
      } else {
        const err = error !== null ? error : stderr;
        reject(Error(`Error pulling remote repo to ${githubPath}: ${err}`));
      }
    });
  });
};
// The directories in 01-Class-Content will have a two-digit leading numeric string.
// In order to decide which content we want to copy, first figure out which dir was added last.
const getMostRecentDirNumber = (dirs) => {
  const mostRecentDir = dirs.sort()[dirs.length - 1];
  return parseInt(mostRecentDir.substring(0, 2), 10);
};
// Get the leading characters from the most recent copied directory.
const getLeadingTargetDirString = (commitType) => {
  const dirs = listDirContents(join(gitlabPath, classContentDir));

  // If the target directory has no content, we're starting at the beginning with '01'...
  // .DS_Store and desktop.ini files can mess this count up, though, so make sure to handle those.
  if (dirs.length === 0 || (dirs.length === 1 && dirs[0] === '.DS_Store') || (dirs.length === 1 && dirs[0] === 'desktop.ini')) {
    return '01';
  }

  const mostRecentDir = getMostRecentDirNumber(dirs);
  // If we're pushing solutions, refer to the most recent directory;
  // otherwise, it's content, and we want to increment it by 1 so we get the upcoming material.
  const dirToUse = commitType === 'solutions' ? `${mostRecentDir}` : `${mostRecentDir + 1}`;

  return dirToUse.length === 1 ? `0${dirToUse}` : `${dirToUse}`; // Add a leading '0', if necessary.
};
const findDirToCopy = (githubPath, leadingTargetDirString) => {
  const dirs = listDirContents(join(githubPath, classContentDir));
  return dirs.find(dir => dir.includes(leadingTargetDirString));
};
// Find the source and target directories.
const prepareFilePaths = (githubPath, commitType) => {
  consoleLog('Preparing file paths');

  const leadingTargetDirString = getLeadingTargetDirString(commitType);
  const dirToCopy = findDirToCopy(githubPath, leadingTargetDirString);
  const paths = {
    sourcePath: join(githubPath, classContentDir, dirToCopy),
    targetPath: join(gitlabPath, classContentDir, dirToCopy),
  };

  return new Promise((resolve, reject) => {
    // If the target path does not exist,
    // we'll need to create it before attempting to copy the files.
    if (fs.existsSync(paths.targetPath)) {
      resolve(paths);
    } else {
      fs.mkdir(paths.targetPath, { recursive: true }, (err) => {
        if (err) {
          reject(Error(err));
        } else {
          resolve(paths);
        }
      });
    }
  });
};
// Copy all of the necessary files into the local Gitlab repo.
const copyFiles = ({ sourcePath, targetPath }) => {
  consoleLog(`Copying files from ${sourcePath} to ${targetPath}`);

  return new Promise((resolve, reject) => {
    childProcess.exec(`cp -r ${sourcePath} ${targetPath}`, (error, stdout, stderr) => {
      if (error || stderr) {
        const err = error !== null ? error : stderr;
        reject(Error(`Error copying content from ${sourcePath} to ${targetPath}: ${err}`));
      } else {
        resolve();
      }
    });
  });
};
// If this is a 'solutions' commit, make sure solution paths and files are not gitignored.
const enableSolutions = (data) => { /* eslint-disable-line arrow-body-style */
  return data.replace(/\*\*\/Solutions\/\*/g, '#**/Solutions/*')
    .replace(/\*\*\/Solved\/\*/g, '#**/Solved/*')
    .replace(/solved/g, '#solved');
};
// If this is a 'content' commit, ignore solutions and solution paths.
const disableSolutions = (data) => { /* eslint-disable-line arrow-body-style */
  return data.replace(/#\*\*\/Solutions\/\*/g, '**/Solutions/*')
    .replace(/#\*\*\/Solved\/\*/g, '**/Solved/*')
    .replace(/#solved/g, 'solved');
};
// Based on the commitType - content or solutions - decide which lines of the .gitignore file
// to comment out or include.
const updateGitignore = (commitType) => {
  consoleLog(`Updating .gitignore for ${commitType} commit type`);

  return new Promise((resolve, reject) => {
    const gitignorePath = `${gitlabPath}.gitignore`;
    const charEncoding = 'utf-8';

    fs.readFile(gitignorePath, charEncoding, (err, data) => {
      if (err) {
        reject(Error(err));
      } else {
        const modifiedData = commitType === 'solutions' ? enableSolutions(data) : disableSolutions(data);

        fs.writeFile(gitignorePath, modifiedData, charEncoding, (error) => {
          if (error) {
            reject(Error(error));
          } else {
            resolve();
          }
        });
      }
    });
  });
};
// Add and commit the changes to the local repo.
const makeLocalCommit = (commitType) => {
  consoleLog('Committing changes');

  return new Promise((resolve, reject) => {
    childProcess.exec(`(cd ${gitlabPath} && git add . && git commit -am '${commitType} commit type')`, (error, stdout, stderr) => {
      if (error || stderr) {
        const err = error !== null ? error : stderr;
        reject(Error(`Error committing to local repo: ${err}`));
      } else {
        resolve();
      }
    });
  });
};
// We're all set, push the results up to Gitlab.
const pushGitlabRepo = () => {
  consoleLog('Pushing to remote repo');

  return new Promise((resolve, reject) => {
    childProcess.exec(`(cd ${gitlabPath} && git push origin master)`, (error) => {
      // It seems that a successful git push will return a success message
      // where we'd normally expect stderr... so just listen for error.
      if (error) {
        reject(Error(`Error pushing to remote repo: ${error}`));
      } else {
        resolve();
      }
    });
  });
};
const execute = () => {
  consoleLog('Starting');

  parseOptions()
    .then((config) => {
      const githubPath = config.gh;
      const commitType = config.ct;

      return pullGithubRepo(githubPath)
        .then(() => prepareFilePaths(githubPath, commitType))
        .then(paths => copyFiles(paths))
        .then(() => updateGitignore(commitType))
        .then(() => makeLocalCommit(commitType))
        .then(() => pushGitlabRepo())
        .then(() => consoleLog('Done!'));
    })
    .catch((error) => {
      consoleError(error);
    });
};

execute();
