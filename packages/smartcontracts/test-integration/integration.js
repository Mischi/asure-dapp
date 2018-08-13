const timeTravel = require('../util/timeTravel');

const DateTime = artifacts.require('DateTime');
const PensionEuroToken = artifacts.require('PensionEuroToken');
const PensionRegistry = artifacts.require('PensionRegistry');
const PensionSettings = artifacts.require('PensionSettings');
const PensionWallet = artifacts.require('PensionWallet');
const Pension = artifacts.require('Pension');
const PensionPoints = artifacts.require('PensionPoints');
const PensionUsers = artifacts.require('PensionUsers');

const testUser = {
  salary: 2500, // salary in €
  pensionRate: 465 // 18.6% of 2500€ (salary)
};

contract('IntegrationTest', async accounts => {
  it('balanceOf', async () => {
    const pensionEuroToken = await PensionEuroToken.deployed();

    const result = await pensionEuroToken.balanceOf.call(accounts[0]);
    assert.equal(result.toNumber(), 100 * 10 ** 6 * 10 ** 18);

    const result2 = await pensionEuroToken.balanceOf.call(accounts[1]);
    assert.equal(result2.toNumber(), 0);
  });

  it('registerUser', async () => {
    const pensionUsers = await PensionUsers.deployed();

    let birthday = new Date(1980, 1, 1).valueOf() / 1000;
    let pensionDate = new Date(2040, 1, 1).valueOf() / 1000;

    await pensionUsers.registerUser(accounts[1], birthday, pensionDate);
    const result = await pensionUsers.getUserPensionDate.call(accounts[1]);
    //console.log("pensionDate: "+JSON.stringify(result));
    assert.equal(result.toNumber(), pensionDate);
  });

  it('deposit and pensionPoints', async function() {
    this.timeout(180 * 1000);

    const pensionEuroToken = await PensionEuroToken.deployed();
    const pensionWallet = await PensionWallet.deployed();
    const pensionPoints = await PensionPoints.deployed();

    //40 years payment
    await pensionEuroToken.approve(
      pensionWallet.address,
      testUser.pensionRate * 10 ** 18 * 40 * 12
    );
    for (let year = 2000; year < 2040; year++) {
      for (let month = 0; month < 12; month++) {
        await pensionWallet.deposit(
          accounts[1],
          year,
          month,
          testUser.pensionRate * 10 ** 18
        );
      }
    }

    const result = await pensionPoints.pointsOf.call(accounts[1]);
    //console.log("pointsOf: " + JSON.stringify(result));
    assert.equal(result.toNumber(), 40000);
  });

  it('getPaymentsByYear', async () => {
    const pensionPoints = await PensionPoints.deployed();

    for (let year = 2000; year < 2040; year++) {
      const result = await pensionPoints.getPaymentsByYear.call(
        accounts[1],
        year
      );
      assert.equal(result.length, 12);
      result.forEach(payment => {
        assert.equal(payment.toNumber(), testUser.pensionRate * 10 ** 18);
      });
    }
  });

  it('getUserPensionDate', async () => {
    const pensionUsers = await PensionUsers.deployed();
    let result = await pensionUsers.getUserPensionDate.call(accounts[1]);
    let pensionDate = new Date(2040, 1, 1).valueOf() / 1000;
    assert.equal(result.toNumber(), pensionDate);
  });

  it('withdraw', async () => {
    const pensionEuroToken = await PensionEuroToken.deployed();
    const pensionWallet = await PensionWallet.deployed();
    const pensionPoints = await PensionPoints.deployed();

    const SECONDS_IN_A_DAY = 60 * 60 * 24;
    const diffInMs = Math.floor(
      (new Date(2040, 1, 1).valueOf() - Date.now()) / 1000
    );
    await timeTravel(diffInMs + SECONDS_IN_A_DAY * 1);

    let resultBalance1 = await pensionEuroToken.balanceOf(accounts[1]);
    assert.equal(resultBalance1.toNumber(), 0);

    await pensionWallet.withdraw(accounts[1], { from: accounts[1] });

    let resultBalance2 = await pensionEuroToken.balanceOf(accounts[1]);
    assert.equal(resultBalance2.toNumber(), 800 * 10 ** 18);
  });

  it('getPointsByYearForAmount.Year', async () => {
    const pensionPoints = await PensionPoints.deployed();
    let points = await pensionPoints.getPointsByYearForAmount(
      2018,
      testUser.pensionRate * 12 * 10 ** 18
    );
    assert.equal(points.toNumber(), 1000);
  });

  it('getPointsByYearForAmount.Month', async () => {
    const pensionPoints = await PensionPoints.deployed();
    let points = await pensionPoints.getPointsByYearForAmount(
      2018,
      testUser.pensionRate * 10 ** 18
    );
    assert.equal(points.toNumber(), 83);
  });
});
