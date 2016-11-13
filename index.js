const co = require('co');
const GustoAutometer = require('./GustoAutometer'); 

co(function * (){
  const gusto = new GustoAutometer();
  yield gusto.insertCode();
  yield gusto.agreeTerms();

  while(true){
    yield gusto.wait(1000);
    yield gusto.answerQuestions();
    // yield gusto.nextPage();
  }
});