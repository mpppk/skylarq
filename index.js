const fs = require('fs');
const yaml = require('js-yaml');
const Nightmare = require('nightmare');

const setting = yaml.safeLoad(fs.readFileSync('./setting.yml','utf8'));

const getAnswer = q =>
  (typeof setting[q] === undefined) ? null : setting[q].answer;

const getAnswerNum = q => setting[q].choices.indexOf(getAnswer(q));

const SUB_QUESTION_LIST = ['下記についてお答えください。', '下記の点での満足度をお聞かせください。', '今回の来店体験からお答えください。'];

const EXCEPTIONAL_QUESTION_LIST = ['1ヶ月以内にこのガストに再来店する。', '一緒に来店された人数についてお聞かせください。'];
// q => 質問内容の文字列, i => 何番目の質問か, qsLength => 全体で何問質問があるか
const getIndexFromQuestionList = (q, i, qsLength) => {
  if(EXCEPTIONAL_QUESTION_LIST.includes(q)){return 4;}
  return (qsLength === 1) ? 3 : ((i+1)*2+2);
};

const extractQuestion = nightmare => {
  return new Promise((resolve, reject) => {
    nightmare.evaluate(SUB_QUESTION_LIST => {
      const mainQuestionText = document.querySelector('.mainQuestion').textContent;
      if(!SUB_QUESTION_LIST.includes(mainQuestionText)){ return mainQuestionText; }
      const subQuestions = document.querySelectorAll('.subQuestion');
      return Array.from(subQuestions, n => n.textContent);
    }, SUB_QUESTION_LIST)
    .then(q => resolve(q), e => console.dir(e));  
  });
}

const inputAnswer = (nightmare, setting) => {
  return new Promise((resolve, reject) => {
    extractQuestion(nightmare)
    .then(qs => {
      qs = Array.isArray(qs) ? qs : [qs];
      const successFlags = qs.map((q, i) => { // nightmareへのside effectが主目的なので注意
        if(typeof setting[q] === 'undefined') {
          reject( new Error('予期しない質問です(' + q + ')'));
          return false;
        }
        if(typeof setting[q].choices !== 'undefined'){
          // nth-of-typeのindexがなぜこうなるのかは分からないがこれで取れる
          const answerIndex = getAnswerNum(q) + 1;
          const selector = '.choices:nth-of-type(' + getIndexFromQuestionList(q, i, qs.length) + ')>.choice:nth-of-type(' + answerIndex + ') label';
          nightmare.click(selector);
        }else{
          nightmare.insert('textarea.faInput', setting[q].answer);
        }
        return true;
      });

      if(!successFlags.includes(false)){
        resolve(nightmare);
      }
    },
    e => console.log('問題文の抽出に失敗しました: ' + e));
  });
}

const insertCode =
  nightmare => nightmare.insert('input[id*="code"]', setting.code).click('a[class="btn"]');

const agreeTerms = 
  nightmare => nightmare.wait('#agreeContainer>#agree')
  .check('#agreeContainer>#agree')
  .click('.inputContainer>.btn');

const co = require('co');
const nightmare = Nightmare({ show: true }).goto('https://my.skylark.co.jp');

co(function * (){
  yield insertCode(nightmare);
  yield agreeTerms(nightmare);
  while(true){ yield inputAnswer(nightmare.wait(1000), setting); }
});