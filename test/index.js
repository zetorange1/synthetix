const {
	assertEventEqual,
	assertEventNotEqual,
	assertBNEqual,
	assertBNNotEqual,
	assertUnitEqual,
	assertUnitNotEqual,
	assertRevert,
	fromUnit,
	takeSnapshot,
	restoreSnapshot,
} = require('../utils/testUtils');

// So we don't have to constantly import our assert helpers everywhere
// we'll just tag them onto the assert object for easy access.
assert.eventEqual = assertEventEqual;
assert.eventNotEqual = assertEventNotEqual;
assert.bnEqual = assertBNEqual;
assert.bnNotEqual = assertBNNotEqual;
assert.etherEqual = assertUnitEqual;
assert.etherNotEqual = assertUnitNotEqual;
assert.unitEqual = assertUnitEqual;
assert.unitNotEqual = assertUnitNotEqual;
assert.revert = assertRevert;

// Helper for logging transactions
console.logTransaction = transaction => {
	const lineLength = 66;

	console.log('='.repeat(lineLength));
	console.log(transaction.tx);

	for (const log of transaction.logs) {
		console.log('-'.repeat(lineLength));
		console.log(`Event: ${log.event}`);
		for (const key of Object.keys(log.args)) {
			if (!/^\d+$/.test(key) && key !== '__length__') {
				if (web3.utils.isBN(log.args[key])) {
					console.log(`    ${key}: ${log.args[key]} fromUnit(${fromUnit(log.args[key])})`);
				} else {
					console.log(`    ${key}: ${log.args[key]}`);
				}
			}
		}
	}

	console.log('-'.repeat(lineLength));
};

// And this is our test sandboxing. It snapshots and restores between each test.
let lastSnapshotId;

beforeEach(async function() {
	lastSnapshotId = await takeSnapshot();
});

afterEach(async function() {
	await restoreSnapshot(lastSnapshotId);
});
