import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as Nightmare from 'nightmare';
import * as co from 'co';
import { Setting } from './Setting';
import { Question } from './Question';

export class GustoQuestionnaire {
  nightmare: Nightmare;
  setting: Setting;
  questions: { [index: string]: Question; };
  SUB_QUESTION_LIST: string[];
  EXCEPTIONAL_QUESTION_LIST: string[];
  beforeQuestions: string[];
  constructor(settingFilePath: string, showBrowser: boolean = false) {
    this.setting = yaml.safeLoad(fs.readFileSync(settingFilePath || './gusto.yml', 'utf8'));
    this.nightmare = new Nightmare({ show: showBrowser }).goto('https://my.skylark.co.jp');
    this.questions = this.setting.questions;
    this.SUB_QUESTION_LIST = ['下記についてお答えください。', '下記の点での満足度をお聞かせください。', '今回の来店体験からお答えください。'];
    this.EXCEPTIONAL_QUESTION_LIST = ['1ヶ月以内にこのガストに再来店する。', '一緒に来店された人数についてお聞かせください。'];
    this.beforeQuestions = ['none'];
}

  private getAnswer(q: string): string | null {
    return (typeof this.questions[q] === undefined) ? null : this.questions[q].answer;
  }

  private getAnswerNum(q: string): number {
    const answer: string | null = this.getAnswer(q);
    return answer === null ? -1 : this.questions[q].choices.indexOf(answer);
  }

  // q => 質問内容の文字列, i => 何番目の質問か, qsLength => 全体で何問質問があるか
  private getIndexFromQuestionList(q: string, i: number, qsLength: number): number {
    if (this.EXCEPTIONAL_QUESTION_LIST.includes(q)) {return 4; }
    return (qsLength === 1) ? 3 : ((i + 1) * 2 + 2);
  }

  private extractQuestions(): Nightmare {
    return this.nightmare.evaluate(SUB_QUESTION_LIST => {
        const mainQuestionDom = document.querySelector('.mainQuestion');
        if (mainQuestionDom === null) {
          throw new Error('main question not found');
        }
        const mainQuestionText: string | null = mainQuestionDom.textContent;
        if (mainQuestionText === null) {
          throw new Error('main question text not found');
        }

        if (!SUB_QUESTION_LIST.includes(mainQuestionText)) { return [mainQuestionText]; }
        const subQuestions = document.querySelectorAll('.subQuestion');
        return Array.from(subQuestions, n => n.textContent);
    }, this.SUB_QUESTION_LIST);
  }

  private getInvalidQuestions(qs: string[]): string[] {
    return qs.filter( q => typeof this.questions[q] === 'undefined');
  }

  private validateQuestions(qs: string[]): Promise<string[]> {
    const invalidQuestions: string[] = this.getInvalidQuestions(qs);
    return (invalidQuestions.length > 0) ?
        Promise.reject( new Error('予期しない質問です(' + invalidQuestions + ')')) :
        Promise.resolve(qs);
  };

  private inputAnswer(qs: string[]): Promise<Nightmare> {
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

  public insertCode(): Nightmare {
    return this.nightmare.insert('input[id*="code"]', this.setting.code.toString()).click('a[class="btn"]');
  }

  public agreeTerms(): Nightmare {
    return this.nightmare.wait('#agreeContainer>#agree')
    .check('#agreeContainer>#agree')
    .click('.inputContainer>.btn');
  }

  public answerQuestions(): Promise<Nightmare> {
    const self = this;
    return co(function*(){
        let qs = yield self.extractQuestions();
        yield self.validateQuestions(qs);
        return yield self.inputAnswer(qs);
    });
  }

  public nextPage(): Nightmare {
      return this.nightmare.wait('a.nextBtn').click('a.nextBtn');
  }

  public hasCooponCode(): Nightmare {
    return this.nightmare.exists('#cooponCode');
  }

  public getCooponCode(): Nightmare {
    return this.nightmare.evaluate(() => document.querySelector('#cooponCode').textContent);
  }

  public end(): Nightmare {
    return this.nightmare.end();
  }

  public waitForNextQuestionOrCooponCode(): Promise<Nightmare> {
    const self = this;
    return co(function*(){
      while (true) {
        try {
          yield self.nightmare.wait(100);

          if (yield self.hasCooponCode()) { return self.getCooponCode(); }

          const qs: string[] = yield self.extractQuestions();
          if (qs === null || typeof qs === 'undefined' || qs.length === 0) { continue; }
          if (JSON.stringify(qs) === JSON.stringify(self.beforeQuestions)) { continue; }
          self.beforeQuestions = qs;
          return qs;
        }catch (e) {
        }
      }
    });
  }

  public extractRemainQuestionNum(): Nightmare {
    return this.nightmare.evaluate(() => {
      const remainQuestionText: string | null = document.querySelector('.progressBox>p').textContent;
      if (remainQuestionText === null) {
        throw new Error('remain question text not found');
      }

      const remainQuestionNumStr: string = remainQuestionText.replace('あと', '').replace('問', '');
      return parseInt(remainQuestionNumStr);
    });
  }
};

