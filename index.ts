#!/usr/bin/env node

import * as co from 'co';
import { SkylarQ } from './src/SkylarQ';
import * as ProgressBar from 'progress';
import * as program from 'commander';
import * as fs from 'fs-extra';

interface CLI extends commander.ICommand {
  filePath?: string;
  browser?: boolean;
  init?: boolean;
}

const barSetting = { total: 33 };
const bar: ProgressBar = new ProgressBar('[:bar] :current/:total :percent :elapseds :etas', barSetting);

const HOME_DIR: string = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
const ORG_SETTING_FILE_PATH: string = './skylarq.yml';
const DEFAULT_SETTING_FILE_PATH: string = HOME_DIR + '/skylarq.yml';

const cli: CLI = program
  .version('0.0.1')
  .option('-b, --browser', 'show browser')
  .option('--init', 'create setting file to home directory')
  .option('-f, --file-path [path]', 'specify config file path', DEFAULT_SETTING_FILE_PATH)
  .parse(process.argv);

if (cli.init) {
  try {
    fs.copySync(ORG_SETTING_FILE_PATH, DEFAULT_SETTING_FILE_PATH, {clobber: false});
    console.log(`setting file is created to ${DEFAULT_SETTING_FILE_PATH}`);
    process.exit(0);
  }catch (e) {
    console.log(`${DEFAULT_SETTING_FILE_PATH} is already exist`);
    process.exit(1);
  }
}

co(function * (){
  // filePath have default value(DEFAULT_SETTING_FILE_PATH), so ignore null check.
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
