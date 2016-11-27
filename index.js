const co = require('co');
const GustoAutometer = require('./build/GustoAutometer');

const ProgressBar = require('progress');
const barSetting = { total: 34 };
const bar = new ProgressBar('[:bar] :current/:total :percent :elapseds :etas', barSetting);

co(function * (){
  const gusto = new GustoAutometer();
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
