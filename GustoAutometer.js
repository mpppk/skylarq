const fs = require('fs');
const yaml = require('js-yaml');
const Nightmare = require('nightmare');

module.exports = class GustoAutometer {
  constructor(settingFilePath){
    this.nightmare = Nightmare({ show: true }).goto('https://my.skylark.co.jp');
    this.setting = yaml.safeLoad(fs.readFileSync(settingFilePath || './gusto.yml', 'utf8'));
    this.SUB_QUESTION_LIST = ['下記についてお答えください。', '下記の点での満足度をお聞かせください。', '今回の来店体験からお答えください。'];    
    this.EXCEPTIONAL_QUESTION_LIST = ['1ヶ月以内にこのガストに再来店する。', '一緒に来店された人数についてお聞かせください。'];
  }

  getAnswer(q){ return (typeof this.setting[q] === undefined) ? null : this.setting[q].answer; }
  getAnswerNum(q){ return this.setting[q].choices.indexOf(this.getAnswer(q)); }

  // q => 質問内容の文字列, i => 何番目の質問か, qsLength => 全体で何問質問があるか
  getIndexFromQuestionList(q, i, qsLength){
    if(this.EXCEPTIONAL_QUESTION_LIST.includes(q)){return 4;}
    return (qsLength === 1) ? 3 : ((i+1)*2+2);
  }

  extractQuestions(){
    return this.nightmare.evaluate(SUB_QUESTION_LIST => {
        const mainQuestionText = document.querySelector('.mainQuestion').textContent;
        if(!SUB_QUESTION_LIST.includes(mainQuestionText)){ return [mainQuestionText]; }
        const subQuestions = document.querySelectorAll('.subQuestion');
        return Array.from(subQuestions, n => n.textContent);
    }, this.SUB_QUESTION_LIST);
  }

  getInvalidQuestions(qs){ return qs.filter( q => typeof this.setting[q] === 'undefined'); } 

  validateQuestions(qs){
    return (this.getInvalidQuestions(qs).length > 0) ? 
        Promise.reject( new Error('予期しない質問です(' + invalidQuestions + ')')) :
        Promise.resolve(qs);
  };

  inputAnswer(qs){
    qs.forEach((q, i) => {
        if(typeof this.setting[q].choices !== 'undefined'){
            // nth-of-typeのindexがなぜこうなるのかは分からないがこれで取れる
            const answerIndex = this.getAnswerNum(q) + 1;
            const selector = '.choices:nth-of-type(' + this.getIndexFromQuestionList(q, i, qs.length) + ')>.choice:nth-of-type(' + answerIndex + ') label';
            this.nightmare.click(selector);
        }else{
            this.nightmare.insert('textarea.faInput', this.setting[q].answer);
        }
    });
    return Promise.resolve(this.nightmare);
  }

  insertCode(){
    return this.nightmare.insert('input[id*="code"]', this.setting.code).click('a[class="btn"]'); 
  }

  agreeTerms(){
    return this.nightmare.wait('#agreeContainer>#agree')
    .check('#agreeContainer>#agree')
    .click('.inputContainer>.btn');
  }

  nextPage(){
      return this.nightmare.wait('a.nextBtn').click('a.nextBtn');
  }

  wait(time){ return this.nightmare.wait(time); }
}

