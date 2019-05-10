'use strict';

const path = require('path');
const fs = require('fs');
const { gray, green, red } = require('chalk');
const { table } = require('table');
const axios = require('axios');
const qs = require('querystring');
const solc = require('solc');

const {
	BUILD_FOLDER,
	FLATTENED_FOLDER,
	CONFIG_FILENAME,
	DEPLOYMENT_FILENAME,
} = require('../constants');

const { ensureNetwork, loadAndCheckRequiredSources, loadConnections } = require('../util');

module.exports = program =>
	program
		.command('verify')
		.description('Verify deployed sources on etherscan')
		.option(
			'-b, --build-path [value]',
			'Path to a folder hosting compiled files from the "build" step in this script',
			path.join(__dirname, '..', '..', '..', BUILD_FOLDER)
		)
		.option('-n, --network <value>', 'The network to run off.', x => x.toLowerCase(), 'kovan')
		.option(
			'-d, --deployment-path <value>',
			`Path to a folder that has your input configuration file ${CONFIG_FILENAME} and where your ${DEPLOYMENT_FILENAME} files will go`
		)
		.action(async ({ buildPath, network, deploymentPath }) => {
			ensureNetwork(network);

			const { config, deployment, deploymentFile } = loadAndCheckRequiredSources({
				deploymentPath,
				network,
			});

			// ensure that every contract in the flag file has a matching deployed address
			const missingDeployments = Object.keys(config).filter(contractName => {
				return !deployment.targets[contractName] || !deployment.targets[contractName].address;
			});

			if (missingDeployments.length) {
				throw Error(
					`Cannot use existing contracts for verification as addresses not found for the following contracts on ${network}:\n` +
						missingDeployments.join('\n') +
						'\n' +
						gray(`Used: ${deploymentFile} as source`)
				);
			}

			const { etherscanUrl } = loadConnections({ network });
			console.log(gray(`Starting ${network.toUpperCase()} contract verification on Etherscan...`));

			const tableData = [];

			for (const name of Object.keys(config)) {
				const { address } = deployment.targets[name];
				// Check if this contract already has been verified.

				let result = await axios.get(etherscanUrl, {
					params: {
						module: 'contract',
						action: 'getabi',
						address,
						apikey: process.env.ETHERSCAN_KEY,
					},
				});

				if (result.data.result === 'Contract source code not verified') {
					const { source } = deployment.targets[name];
					console.log(
						gray(` - Contract ${name} not yet verified (source of "${source}.sol"). Verifying...`)
					);

					// Get the transaction that created the contract with its resulting bytecode.
					result = await axios.get(etherscanUrl, {
						params: {
							module: 'account',
							action: 'txlist',
							address,
							sort: 'asc',
							apikey: process.env.ETHERSCAN_KEY,
						},
					});

					// Get the bytecode that was in that transaction.
					const deployedBytecode = result.data.result[0].input;

					// add the transacton and timestamp to the json file
					deployment.targets[name].txn = `https://${network}.etherscan.io/tx/${
						result.data.result[0].hash
					}`;
					deployment.targets[name].timestamp = new Date(result.data.result[0].timeStamp * 1000);

					fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));

					// Grab the last 50 characters of the compiled bytecode
					const compiledBytecode = deployment.sources[source].bytecode.slice(-100);

					const pattern = new RegExp(`${compiledBytecode}(.*)$`);
					const constructorArguments = pattern.exec(deployedBytecode)[1];

					console.log(gray(' - Constructor arguments', constructorArguments));

					const readFlattened = () => {
						const flattenedFilename = path.join(buildPath, FLATTENED_FOLDER, `${source}.sol`);
						try {
							return fs.readFileSync(flattenedFilename).toString();
						} catch (err) {
							throw Error(
								`Cannot read file ${flattenedFilename} - have you run the build step yet???`
							);
						}
					};
					result = await axios.post(
						etherscanUrl,
						qs.stringify({
							module: 'contract',
							action: 'verifysourcecode',
							contractaddress: address,
							sourceCode: readFlattened(),
							contractname: source,
							// note: spelling mistake is on etherscan's side
							constructorArguements: constructorArguments,
							compilerversion: 'v' + solc.version().replace('.Emscripten.clang', ''), // The version reported by solc-js is too verbose and needs a v at the front
							optimizationUsed: 1,
							runs: 200,
							libraryname1: 'SafeDecimalMath',
							libraryaddress1: deployment.targets['SafeDecimalMath'].address,
							apikey: process.env.ETHERSCAN_KEY,
						}),
						{
							headers: {
								'Content-Type': 'application/x-www-form-urlencoded',
							},
						}
					);

					console.log(gray(' - Got result:', result.data.result));

					if (result.data.result === 'Contract source code already verified') {
						console.log(green(` - Verified ${name}`));
						// Ugh, ok, you lie, but fine, skip and continue.
						tableData.push([name, address, 'Successfully verified']);
						continue;
					}
					const guid = result.data.result;

					if (!result.data.status) {
						tableData.push([name, address, `Unable to verify, Etherscan returned "${guid}`]);
						continue;
					} else if (!guid || guid.length !== 50) {
						console.log(red(`Invalid GUID from Etherscan (see response above).`));
						tableData.push([name, address, 'Unable to verify (invalid GUID)']);
						continue;
					}

					let status = '';
					while (status !== 'Pass - Verified') {
						console.log(gray(' - Checking verification status...'));

						result = await axios.get(etherscanUrl, {
							params: {
								module: 'contract',
								action: 'checkverifystatus',
								guid,
							},
						});
						status = result.data.result;

						console.log(gray(` - "${status}" response from Etherscan`));

						if (status === 'Fail - Unable to verify') {
							console.log(red(` - Unable to verify ${name}.`));
							tableData.push([name, address, 'Unable to verify']);

							break;
						}

						if (status !== 'Pass - Verified') {
							console.log(gray(' - Sleeping for 5 seconds and re-checking.'));
							await new Promise(resolve => setTimeout(resolve, 5000));
						} else {
							console.log(green(` - Verified ${name}`));
							tableData.push([name, address, 'Successfully verified']);
						}
					}
				} else {
					console.log(gray(` - Already verified ${name}`));
					tableData.push([name, address, 'Already verified']);
				}
			}

			console.log(gray('Verification state'));
			console.log(table(tableData));
		});
