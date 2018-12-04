const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

function PathObject(sourcePath, targetPath, targetParentPath) {
  this.sourcePath = sourcePath;
  this.targetPath = targetPath;
  this.targetParentPath = targetParentPath;
};

const { sep, join } = path;
const gitlabPath = `..${sep}..${sep}`; // The path to the Gitlab repo should always be ../../
const classContentDir = '01-Class-Content';
const lessonPlanDir = `02-lesson-plans${sep}part-time`;
const consoleLog = message => console.log(message); /* eslint-disable-line no-console */
const consoleError = message => console.error(message); /* eslint-disable-line no-console */
const listDirContents = dirPath => fs.readdirSync(dirPath);
// Get the options from the CLI and put them into a config object.
// This behavior probably doesn't need to be handled with a promise, but I like
// that it allows the use of a single .catch() for the whole script.
const parseOptions = () => {
  const optKeys = ['-gh', '-ct']; // Valid option keys.
  const ctValues = ['content', 'solutions']; // Used to make sure user has passed a valid option for '-ct'.
  const getOptionValue = (option) => {
    const optionIndex = process.argv.indexOf(option);
    return optionIndex !== -1 ? `${process.argv[optionIndex + 1]}` : undefined;
  };

  return new Promise((resolve, reject) => {
    consoleLog('Parsing command line options');
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
  return new Promise((resolve, reject) => {
    consoleLog('Pulling from remote repo');
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
// We'll use the leading characters from the classContentDir, which will be the same ones used in the lessonPlanDir.
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
const findDirToCopy = (githubPath, leadingTargetDirString, contentDir) => {
  const dirs = listDirContents(join(githubPath, contentDir));
  return dirs.find(dir => dir.includes(leadingTargetDirString));
};
// Find the source and target directories.
const prepareFilePaths = (githubPath, commitType) => {
  const leadingTargetDirString = getLeadingTargetDirString(commitType);
  const paths = [
    new PathObject(join(githubPath, classContentDir, findDirToCopy(githubPath, leadingTargetDirString, classContentDir)), join(gitlabPath, classContentDir, findDirToCopy(githubPath, leadingTargetDirString, classContentDir)), join(gitlabPath, classContentDir)),
    new PathObject(join(githubPath, lessonPlanDir, findDirToCopy(githubPath, leadingTargetDirString, lessonPlanDir)), join(gitlabPath, lessonPlanDir, findDirToCopy(githubPath, leadingTargetDirString, lessonPlanDir)), join(gitlabPath, lessonPlanDir)),
  ];

  return new Promise((resolve, reject) => {
    consoleLog('Preparing file paths');
    // If the target paths don't exist,
    // we'll need to create them before attempting to copy the files.
    for (let i = 0; i < paths.length; i++) {
      if (fs.existsSync(paths[i].targetPath)) {
        return;
      } else {
        fs.mkdir(paths[i].targetPath, { recursive: true }, (err) => {
          if (err) {
            reject(Error(err));
          } else {
            return;
          }
        });    
      }
    }

    resolve(paths);
  });
};
const copyFiles = (paths) => {
  let error;

  for (let i = 0; i < paths.length; i++) {
    // consoleLog(`Copying files from ${paths[i].sourcePath} to ${paths[i].targetPath}`);

    childProcess.exec(`cp -r ${paths[i].sourcePath} ${paths[i].targetParentPath}`, (err, stdout, stderr) => {
      if (err || stderr) {
        error = Error(`Error copying content from ${paths[i].sourcePath} to ${paths[i].targetPath}: ${err}`)
      } else {
        return;
      }
    });
  };

  return new Promise((resolve, reject) => error ? reject(error) : resolve());
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
  return new Promise((resolve, reject) => {
    consoleLog(`Updating .gitignore for ${commitType} commit type`);
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
// We'll have to handle all of the git stuff with one process.
const handleGit = (commitType) => {
  return new Promise((resolve, reject) => {
    const git = childProcess.spawn(`git add --all && git commit -m "${commitType} commit type" && git push origin master`, [], { cwd: gitlabPath, shell: true })

    git.stdout.on('data', () => {
      resolve()
    })
  })
}

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
        .then(() => handleGit(commitType))
        .then(() => consoleLog('Done!'));
    })
    .catch((error) => {
      consoleError(error);
    });
};

execute();
