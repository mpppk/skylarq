import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as Nightmare from 'nightmare';
import * as co from 'co';
import { Setting } from './Setting';
import { Question } from './Question';

module.exports = class GustoAutometer {
  nightmare: Nightmare;
  setting: Setting;
  questions: { [index: string]: Question; };
  SUB_QUESTION_LIST: string[];
  EXCEPTIONAL_QUESTION_LIST: string[];
  constructor(settingFilePath: string) {
    this.setting = yaml.safeLoad(fs.readFileSync(settingFilePath || './gusto.yml', 'utf8'));
    this.nightmare = new Nightmare({ show: true }).goto('https://my.skylark.co.jp');
    this.questions = this.setting.questions;
    this.SUB_QUESTION_LIST = ['下記についてお答えください。', '下記の点での満足度をお聞かせください。', '今回の来店体験からお答えください。'];
    this.EXCEPTIONAL_QUESTION_LIST = ['1ヶ月以内にこのガストに再来店する。', '一緒に来店された人数についてお聞かせください。'];
  }

  getAnswer(q: string): string | null {
    return (typeof this.questions[q] === undefined) ? null : this.questions[q].answer;
  }

  getAnswerNum(q: string): number {
    const answer: string | null = this.getAnswer(q);
    return answer === null ? -1 : this.questions[q].choices.indexOf(answer);
  }

  // q => 質問内容の文字列, i => 何番目の質問か, qsLength => 全体で何問質問があるか
  getIndexFromQuestionList(q: string, i: number, qsLength: number): number {
    if (this.EXCEPTIONAL_QUESTION_LIST.includes(q)) {return 4; }
    return (qsLength === 1) ? 3 : ((i + 1) * 2 + 2);
  }

  extractQuestions(): Nightmare {
    return this.nightmare.evaluate(SUB_QUESTION_LIST => {
        const mainQuestionText: string | null = document.querySelector('.mainQuestion').textContent;
        if (mainQuestionText === null) {
          throw new Error('main question text not found');
        }

        if (!SUB_QUESTION_LIST.includes(mainQuestionText)) { return [mainQuestionText]; }
        const subQuestions = document.querySelectorAll('.subQuestion');
        return Array.from(subQuestions, n => n.textContent);
    }, this.SUB_QUESTION_LIST);
  }

  getInvalidQuestions(qs: string[]): string[] {
    return qs.filter( q => typeof this.questions[q] === 'undefined');
  }

  validateQuestions(qs: string[]): Promise<string[]> {
    const invalidQuestions: string[] = this.getInvalidQuestions(qs);
    return (invalidQuestions.length > 0) ?
        Promise.reject( new Error('予期しない質問です(' + invalidQuestions + ')')) :
        Promise.resolve(qs);
  };

  inputAnswer(qs: string[]): Promise<Nightmare> {
    qs.forEach((q, i) => {
        if (typeof this.questions[q].choices !== 'undefined') {
            // nth-of-typeのindexがなぜこうなるのかは分からないがこれで取れる
            const answerIndex = this.getAnswerNum(q) + 1;
            const selector = '.choices:nth-of-type(' + this.getIndexFromQuestionList(q, i, qs.length) + ')>.choice:nth-of-type(' + answerIndex + ') label';
            this.nightmare.click(selector);
        }else {
            this.nightmare.insert('textarea.faInput', this.questions[q].answer);
        }
    });
    return Promise.resolve(this.nightmare);
  }

  insertCode(): Nightmare {
    return this.nightmare.insert('input[id*="code"]', this.setting.code.toString()).click('a[class="btn"]');
  }

  agreeTerms(): Nightmare {
    return this.nightmare.wait('#agreeContainer>#agree')
    .check('#agreeContainer>#agree')
    .click('.inputContainer>.btn');
  }

  answerQuestions(): Promise<Nightmare> {
    const self = this;
    return co(function*(){
        let qs = yield self.extractQuestions();
        yield self.validateQuestions(qs);
        return yield self.inputAnswer(qs);
    });
  }

  nextPage(): Nightmare {
      return this.nightmare.wait('a.nextBtn').click('a.nextBtn');
  }

  wait(time: number): Nightmare {
    return this.nightmare.wait(time);
  }

  hasCooponCode(): Nightmare {
    return this.nightmare.exists('#cooponCode');
  }

  getCooponCode(): Nightmare {
    return this.nightmare.evaluate(() => document.querySelector('#cooponCode').textContent);
  }

  end(): Nightmare {
    return this.nightmare.end();
  }
};

