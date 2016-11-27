#!/usr/bin/env node

import * as co from 'co';
import { SkylarQ } from './src/SkylarQ';
import * as ProgressBar from 'progress';
import * as program from 'commander';

interface CLI extends commander.ICommand {
  filePath?: string;
  browser?: boolean;
}

const barSetting = { total: 33 };
const bar: ProgressBar = new ProgressBar('[:bar] :current/:total :percent :elapseds :etas', barSetting);

const cli: CLI = program
  .version('0.0.1')
  .option('-b, --browser', 'Show browser')
  .option('-f, --file-path [path]', 'Specify config file path', './skylarq.yml')
  .parse(process.argv);

co(function * (){
  // filePath have default value(./skylarq.yml), so ignore null check.
  const skylarq: SkylarQ = new SkylarQ(cli.filePath!, cli.browser);
  yield skylarq.insertCode();
  yield skylarq.agreeTerms();

  while (true) {
    yield skylarq.waitForNextQuestionOrCouponCode();
    if (yield skylarq.hasCouponCode()) { break; }
    yield skylarq.answerQuestions();
    let remainQuestionNum: number = yield skylarq.extractRemainQuestionNum();
    bar.update((barSetting.total - remainQuestionNum) / barSetting.total);
    yield skylarq.nextPage();
  }

  const couponCode: number = yield skylarq.getCouponCode();
  console.log('coupon code: ' + couponCode);
  yield skylarq.end();
});
