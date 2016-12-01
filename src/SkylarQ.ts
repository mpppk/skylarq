import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as Nightmare from 'nightmare';
import * as co from 'co';
import { Setting } from './Setting';
import { Question } from './Question';

/**
 * Skylarkのアンケートに自動回答するためのクラス
 */
export class SkylarQ {
  nightmare: Nightmare;
  setting: Setting;
  questions: { [index: string]: Question; };
  SUB_QUESTION_LIST: string[];
  EXCEPTIONAL_QUESTION_LIST: string[];
  beforeQuestions: string[];
  constructor(settingFilePath: string, showBrowser: boolean = false) {
    this.setting = yaml.safeLoad(fs.readFileSync(settingFilePath, 'utf8'));
    this.nightmare = new Nightmare({ show: showBrowser }).goto('https://my.skylark.co.jp');
    this.questions = this.setting.questions;
    this.SUB_QUESTION_LIST = ['下記についてお答えください。', '下記の点での満足度をお聞かせください。', '今回の来店体験からお答えください。'];
    this.EXCEPTIONAL_QUESTION_LIST = ['1ヶ月以内にこのガストに再来店する。', '一緒に来店された人数についてお聞かせください。'];
    this.beforeQuestions = ['none'];
}

  /**
   * 与えられた質問文に対応する、設定ファイルに書かれた回答を返す
   * @param q 質問文
   * @returns {string}　対応する回答
   */
  private getAnswer(q: string): string | null {
    return (typeof this.questions[q] === undefined) ? null : this.questions[q].answer;
  }

  /**
   * 与えられた質問文に対応する回答が、上から何番目の選択肢かをを返す
   * @param q 質問文
   * @returns {number} 回答が上から何番目か
   */
  private getAnswerNum(q: string): number {
    const answer: string | null = this.getAnswer(q);
    return answer === null ? -1 : this.questions[q].choices.indexOf(answer);
  }

  /**
   * 質問文に対応する回答のDOM上のindexを返す
   * @param q 質問文
   * @param i qが何番目の質問か
   * @param qsLength 全体で何問質問があるか
   * @returns {number} DOM上のindex
   */
  private getIndexFromQuestionList(q: string, i: number, qsLength: number): number {
    if (this.EXCEPTIONAL_QUESTION_LIST.includes(q)) {return 4; }
    return (qsLength === 1) ? 3 : ((i + 1) * 2 + 2);
  }

  /**
   * 質問リストをページから取得して返す
   * @returns {Nightmare} 取得した質問リスト(非同期)
   */
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

  /**
   * 与えられた質問リストのうち、不正な質問を返す
   * @param qs チェックする質問リスト
   * @returns {string[]} 不正な質問リスト
   */
  private getInvalidQuestions(qs: string[]): string[] {
    return qs.filter( q => typeof this.questions[q] === 'undefined');
  }

  /**
   * 与えられた質問リストに不正な質問が含まれていればrejectする
   * @param qs　チェックする質問リスト
   * @returns {Promise<never>|Promise<string[]>}
   */
  private validateQuestions(qs: string[]): Promise<string[]> {
    const invalidQuestions: string[] = this.getInvalidQuestions(qs);
    return (invalidQuestions.length > 0) ?
        Promise.reject( new Error('予期しない質問です(' + invalidQuestions + ')')) :
        Promise.resolve(qs);
  };

  /**
   * 与えられた質問リストに対応する回答をブラウザに入力する
   * @param qs　質問リスト
   * @returns {Promise<T>}
   */
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

  /**
   * レシートに記載されている番号を設定ファイルから参照して入力し、次の画面へ進む
   * @returns {Nightmare}
   */
  public insertCode(): Nightmare {
    return this.nightmare.insert('input[id*="code"]', this.setting.code.toString()).click('a[class="btn"]');
  }

  /**
   * 規約に同意し、次の画面へ進む
   * @returns {Nightmare}
   */
  public agreeTerms(): Nightmare {
    return this.nightmare.wait('#agreeContainer>#agree')
    .check('#agreeContainer>#agree')
    .click('.inputContainer>.btn');
  }

  /**
   * 質問に回答する
   * @returns {Promise<R>}
   */
  public answerQuestions(): Promise<Nightmare> {
    const self = this;
    return co(function*(){
        let qs = yield self.extractQuestions();
        yield self.validateQuestions(qs);
        return yield self.inputAnswer(qs);
    });
  }

  /**
   * 次の画面へ進む
   * @returns {Nightmare}
   */
  public nextPage(): Nightmare {
      return this.nightmare.wait('a.nextBtn').click('a.nextBtn');
  }

  /**
   * 5桁のクーポンコードが表示されているかを判定する
   * @returns {Nightmare} クーポンコード表示の有無
   */
  public hasCouponCode(): Nightmare {
    return this.nightmare.exists('#cooponCode');
  }

  /**
   * 5桁のクーポンコードを返す
   * @returns {Nightmare} クーポンコード
   */
  public getCouponCode(): Nightmare {
    return this.nightmare.evaluate(() => document.querySelector('#cooponCode').textContent);
  }

  public end(): Nightmare {
    return this.nightmare.end();
  }

  /**
   * 次の質問かクーポンコードが表示されるまで待つ
   * @returns {Promise<R>}
   */
  public waitForNextQuestionOrCouponCode(): Promise<Nightmare> {
    const self = this;
    return co(function*(){
      while (true) {
        try {
          yield self.nightmare.wait(100);

          if (yield self.hasCouponCode()) { return self.getCouponCode(); }

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

  /**
   * 残りの質問数をブラウザから取得する
   * @returns {Nightmare} 残りの質問数
   */
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
}

