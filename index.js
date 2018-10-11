// To get things started, I added this logic to receive options from the command line.

const childProcess = require('child_process');

const optKeys = ['-gh', '-d'];
const getOptionValue = (option) => {
	const optionIndex = process.argv.indexOf(option);;
	return optionIndex !== -1 ? `${process.argv[optionIndex + 1]}` : undefined;
};
const options = optKeys.reduce((acc, optKey) => {
	const formattedKey = optKey.substr(1); // Remove the leading '-' from the option.
	acc[formattedKey] = getOptionValue(optKey);
	return acc;
}, {});

console.log(options);
