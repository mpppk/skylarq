#!/usr/bin/env node

import * as co from 'co';
import { GustoAutometer } from './src/GustoAutometer';
import * as ProgressBar from 'progress';
import * as program from 'commander';

interface CLI extends commander.ICommand {
  filePath?: string;
  browser?: boolean;
}

const barSetting = { total: 33 };
const bar: ProgressBar = new ProgressBar('[:bar] :current/:total :percent :elapseds :etas', barSetting);
bar.update(0);

const cli: CLI = program
  .version('0.0.1')
  .option('-b, --browser', 'Show browser')
  .option('-f, --file-path [path]', 'Specify config file path', './gusto.yml')
  .parse(process.argv);

co(function * (){
  // 必ずfilePathには何らかの値が含まれるはずなのでnullチェックを無視
  const gusto: GustoAutometer = new GustoAutometer(cli.filePath!, cli.browser);
  yield gusto.insertCode();
  yield gusto.agreeTerms();

  while(true){
    yield gusto.waitForNextQuestionOrCooponCode();
    if(yield gusto.hasCooponCode()){ break; }
    yield gusto.answerQuestions();
    let remainQuestionNum: number = yield gusto.extractRemainQuestionNum();
    bar.update((barSetting.total - remainQuestionNum) / barSetting.total);
    yield gusto.nextPage();
  }

  const cooponCode: number = yield gusto.getCooponCode();
  console.log('coopon code: ' + cooponCode);
  // yield gusto.end();
});
