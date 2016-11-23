const co = require('co');
const GustoAutometer = require('./build/GustoAutometer'); 

co(function * (){
  const gusto = new GustoAutometer();
  yield gusto.insertCode();
  yield gusto.agreeTerms();

  while(true){
    yield gusto.wait(3000);
    yield gusto.answerQuestions();
    if(yield gusto.hasCooponCode){ break; }
    yield gusto.nextPage();
  }

  const cooponCode = yield gusto.getCooponCode(); 
  console.log('coopon code: ' + cooponCode);
  // yield gusto.end();
});
