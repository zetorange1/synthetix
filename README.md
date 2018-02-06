# Havven

Havven is a decentralised payment network and stablecoin.
It is critical to the system's viability that functionality is phased in over time. The initial release will provide a functional stablecoin and the opportunity to collect significant data on the market response. This will ultimately protect the system and those who back it as the network scales.

The initial release of Havven will possess most of the key features of the system.

* A two token system composed of a stablecoin (nomins) and collateral token (havvens).
* Nomins are backed with a pool of value with which it is convertible.
* The funds (ether) to stake nomins are provided by the owners of the backing token through the token sale.
* Those staking the system, by owning havvens, are rewarded with fees charged on nomin transactions;

However it purposely omits others:

* The nomin supply is centrally constrained, with only the havven foundation being able to expand it;
* Users cannot issue nomins against their havvens, and therefore fee incentive mechanisms are not yet activated;
* The backing capital cannot be expanded by the market, and so the currency’s ultimate total supply is constrained;

In the version 1.0 system, the nomin contract owner can only expand the supply of nomins if it can provide adequate backing.
Users can buy and sell nomins into the pool for $1 USD worth of ether. The ether price is
obtained from a trusted oracle. Fees charged on nomins are paid to owners of the havven token in proportion with the the number of havvens they hold.

Please note that this repository is under development.
The code here will be under continual audit and
improvement up until release of the completed system.


## Usage and requirements

Deployment and testing scripts require Python 3.6+, web3.py 4.0.0+, and pysolc 2.1.0+. To install, ensure that python is up to date and run:

```pip3 install -r requirements.txt```

Ensure `BLOCKCHAIN_ADDRESS` in `utils/deployutils.py` is pointing to a running
Ethereum client or `ganache-cli` instance. Update other variables like
the master address as appropriate. Then, from the root directory,
deployment is as simple as

```python3 deploy.py```

Similarly, the test suite is run with

```python3 run_tests.py```


## Files

The following files should be sufficient for deploying and testing version 1.0
of the havven system. We have leant heavily towards logical simplicity and
explicitness where possible; while in documentation and naming conventions,
verbosity and descriptiveness even to the point of excess.
Some consideration has been given to efficiency, but typically architecturally,
in determining how to allow operations to pay for themselves as they go.
We have mostly forgone local and machine optimisations whenever they would
come at the expense of clarity or simplicity.

* `deploy.py` for deploying Havven contracts to the blockchain.
* `run_tests.py` runs the test suite.
* `contracts/` contains smart contract code to be deployed.
* `contracts/Court.sol` a court of arbitration to enable the balance of malicious contracts to be democratically confiscated.
* `contracts/ERC20Token.sol` a generic ERC20 token.
* `contracts/ERC20FeeToken.sol` an ERC20 token that also charges fees on transfers.
* `contracts/EtherNomin.sol` ether-backed nomin contract, with liquidation and confiscation logic.
* `contracts/Havven.sol` havven collateral token, including calculations involving entitlements to fees being generated by nomins.
* `contracts/HavvenEscrow.sol` vesting schedule manager, allows vested havvens to be freed up after certain dates, and manages fee entitlements.
* `contracts/Owned.sol` a contract with an owner.
* `contracts/SafeDecimalMath.sol` a math library for unsigned fixed point decimal arithmetic, with built-in safety checking.
* `tests/` test cases.
* `tests/contracts` contracts used by the test suite.
* `utils/deployutils.py` deployment helper functions.
* `utils/testutils.py` testing helper functions.
