#!/usr/bin/env node

import * as co from 'co';
import { GustoQuestionnaire } from './src/GustoQuestionnaire';
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
  .option('-f, --file-path [path]', 'Specify config file path', './gusto.yml')
  .parse(process.argv);

co(function * (){
  // filePath have default value(./gusto.yml), so ignore null check.
  const gusto: GustoQuestionnaire = new GustoQuestionnaire(cli.filePath!, cli.browser);
  yield gusto.insertCode();
  yield gusto.agreeTerms();

  while (true) {
    yield gusto.waitForNextQuestionOrCouponCode();
    if (yield gusto.hasCouponCode()) { break; }
    yield gusto.answerQuestions();
    let remainQuestionNum: number = yield gusto.extractRemainQuestionNum();
    bar.update((barSetting.total - remainQuestionNum) / barSetting.total);
    yield gusto.nextPage();
  }

  const couponCode: number = yield gusto.getCouponCode();
  console.log('coupon code: ' + couponCode);
  yield gusto.end();
});
