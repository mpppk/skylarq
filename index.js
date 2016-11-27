#!/usr/bin/env node

const co = require('co');
const GustoAutometer = require('./build/GustoAutometer');

const ProgressBar = require('progress');
const barSetting = { total: 33 };
const bar = new ProgressBar('[:bar] :current/:total :percent :elapseds :etas', barSetting);

const program = require('commander');

program
  .version('0.0.1')
  .option('-b, --browser', 'Show browser')
  .option('-f, --file-path [path]', 'Specify config file path', './gusto.yml')
  .parse(process.argv);

co(function * (){
  const gusto = new GustoAutometer(program.filePath, program.browser);
  yield gusto.insertCode();
  yield gusto.agreeTerms();

  while(true){
    yield gusto.waitForNextQuestionOrCooponCode();
    if(yield gusto.hasCooponCode()){ break; }
    yield gusto.answerQuestions();
    let remainQuestionNum = yield gusto.extractRemainQuestionNum();
    bar.update((barSetting.total - remainQuestionNum) / barSetting.total);
    yield gusto.nextPage();
  }

  const cooponCode = yield gusto.getCooponCode(); 
  console.log('coopon code: ' + cooponCode);
  // yield gusto.end();
});
