const fs = require('fs');
const yaml = require('js-yaml');
const Nightmare = require('nightmare');
let nightmare = Nightmare({ show: true });

const setting = yaml.safeLoad(fs.readFileSync('./setting.yml','utf8'));
const terminateAbnormaly = () => {
  console.log('実行に失敗したためプログラムを終了します');
  process.exit(1);
};

const getAnswer = q =>
  (typeof setting[q] === undefined) ? null : setting[q].answer;

const getAnswerNum = q => setting[q].choices.indexOf(getAnswer(q));

const extractQuestion = nightmare => {
  console.log('extract question');
  return new Promise((resolve, reject) => {
    nightmare.evaluate(() => {
      const mainQuestionText = document.querySelector('.mainQuestion').textContent
      if(mainQuestionText !== '下記についてお答えください。' && mainQuestionText !== '下記の点での満足度をお聞かせください。'){
        console.log('single question');
        return mainQuestionText;
      }

      const subQuestions = document.querySelectorAll('.subQuestion')
      return Array.from(subQuestions, n => n.textContent);
    })
    .then(q => resolve(q), e => console.dir(e));  
  });
}

const inputAnswer = (nightmare, setting) => {
  return new Promise((resolve, reject) => {
    extractQuestion(nightmare)
    .then(qs => {
      qs = Array.isArray(qs) ? qs : [qs];
      const successFlags = qs.map((q, i) => { // nightmareへのside effectが主目的なので注意
        console.log(i + ' question is ' + q);
        if(typeof setting[q] === 'undefined') {
          reject( new Error('予期しない質問です(' + q + ')'));
          return false;
        }
        if(typeof setting[q].choices !== 'undefined'){
          // nth-of-typeのindexがなぜこうなるのかは分からないがこれで取れる
          const choicesIndex = (qs.length === 1) ? 3 : ((i+1)*2+2);
          const answerIndex = getAnswerNum(q) + 1;
          const selector = '.choices:nth-of-type(' + choicesIndex + ')>.choice:nth-of-type(' + answerIndex + ') label';
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

nightmare = nightmare
  .goto('https://my.skylark.co.jp')
  // .insert('input[id*="code"]', '018978201611040115078884')
  .insert('input[id*="code"]', setting.code)
  .click('a[class="btn"]')
  .wait('#agreeContainer>#agree')
  .check('#agreeContainer>#agree')
  .click('.inputContainer>.btn')

const loop = nightmare => {
  console.log('in loop');
  // if(nightmare.exists('#cooponCode')){
  //   console.log('find coopon code');
  //   nightmare.screenshot('./' + setting.code + '.png', true);
  //   nightmare.evaluate(() => document.getElementById('#cooponCode').textContent)
  //   .then(c => {
  //     console.log('coopon code:');
  //     console.log(c);
  //     process.exit(0);
  //   });
  // }
  console.log('start');
  inputAnswer(nightmare.wait(1000), setting)
  .then(() => {
    loop(nightmare
    .wait(500)
    .click('a.nextBtn'));
    // if(nextPage.exists('#cooponCode')){
    //   nextPage.screenshot('./' + setting.code + '.png', true);
    //   nextPage.evaluate(() => document.getElementById('#cooponCode'))
    //   .then(c => {
    //     console.log('coopon code:');
    //     console.log(c);
    //   });
    // }
  },
  e => {
    console.log('回答の入力に失敗しました: ' + e);
    // process.exit(1);
  })
  // .then(loopFlag => loopFlag ? loop(nightmare) : 'finish');
}


loop(nightmare);
// chooseFromChoices(nightmare)
//   .then(() => {
//     nightmare.evaluate(() => document.querySelector('.mainQuestion').textContent);
//   });
 
  // 今回ガストを利用されて、お客様の全体的な満足度はいかがでしたか? 残34
  // なぜガストでの利用に満足なさらなかったのか、理由をできるだけ詳しくご記入ください 残33
  // 店内のスタッフの態度 残30
  // .wait('.choice')
  // .click('.choices>.choice:nth-of-type(1) label')
  // .click('a.nextBtn')
  // .wait('textarea.faInput')
  // なぜガストでの利用に大変満足なさったのか、理由をできるだけ詳しくご記入ください 残31
  // .insert('textarea.faInput', '最高でした')
  // .click('a.nextBtn')
  // 下記についてお答えください。 残29
  // ご来店の際、「いらっしゃいませ」の挨拶
  // お帰りの際、「ありがとうございました」の挨拶
  // 店内のスタッフの明るく元気良いキビキビとした行動
  // 店内のスタッフの言葉遣い
  // 店内のスタッフの表情
  // .wait(1000)
  // .click('form[name="form"]>div:nth-of-type(4)>.choice:nth-of-type(1) label')
  // .click('form[name="form"]>div:nth-of-type(6)>.choice:nth-of-type(1) label')
  // .click('form[name="form"]>div:nth-of-type(8)>.choice:nth-of-type(1) label')
  // .click('form[name="form"]>div:nth-of-type(10)>.choice:nth-of-type(1) label')
  // .click('form[name="form"]>div:nth-of-type(12)>.choice:nth-of-type(1) label')
  // .click('a.nextBtn')
  // サービスのタイミング 残28
  // .wait(1000)
  // .click('.choices>.choice:nth-of-type(1) label')
  // .click('a.nextBtn')
  // 店内のスタッフの気配り 残28
  // .wait(1000)
  // .click('.choices>.choice:nth-of-type(1) label')
  // .click('a.nextBtn')
  // お料理の味 残26
  // .wait(1000)
  // .click('.choices>.choice:nth-of-type(1) label')
  // .click('a.nextBtn')
  // // 下記の点での満足度をお聞かせください。 残25
  // .wait(1000)
  // // // 注文したメニューが正しく提供された
  // .click('form[name="form"]>div:nth-of-type(4)>.choice:nth-of-type(1) label')
  // // // 商品の盛り付けはメニュー通りである
  // .click('form[name="form"]>div:nth-of-type(6)>.choice:nth-of-type(1) label')
  // // // お料理の温度(熱い料理は熱く、冷たい料理は冷たく提供)
  // .click('form[name="form"]>div:nth-of-type(8)>.choice:nth-of-type(1) label')
  // .click('a.nextBtn')
  // // トイレを使いましたか? 残15
  // .wait(1000)
  // .click('.choices>.choice:nth-of-type(1) label')
  // .click('a.nextBtn')
  // // トイレの清潔さ 残14
  // .wait(1000)
  // .click('.choices>.choice:nth-of-type(1) label')
  // .click('a.nextBtn')
  // // 下記についてお答えください 残13
  // .wait(1000)
  // // 客先の清潔さ
  // .click('form[name="form"]>div:nth-of-type(4)>.choice:nth-of-type(1) label')
  // // 店内のスタッフの身だしなみの清潔感
  // .click('form[name="form"]>div:nth-of-type(6)>.choice:nth-of-type(1) label')
  // // お客様が食べたいと思うメニューの品揃え
  // .click('form[name="form"]>div:nth-of-type(8)>.choice:nth-of-type(1) label')
  // .click('a.nextBtn')
  // 今回の来店時に何か問題はありましたか?またその際に問題となった点を店内スタッフにお伝えいただきましたか? 残12
  // .wait(1000)
  // .click('.choices>.choice:nth-of-type(1) label')
  // .click('a.nextBtn')
  // 今回の来店体験からお答えください。 一ヶ月以内にこのガストに再来店する 残10 
  // .wait(1000)
  // .click('.choices>.choice:nth-of-type(1) label')
  // .click('a.nextBtn')
  // このガストを友人等に勧める 残9
  // .wait(1000)
  // .click('.choices>.choice:nth-of-type(1) label')
  // .click('a.nextBtn')
  // // 今回がこのガストには初来店でしたか? 残8
  // .wait(1000)
  // .click('.choices>.choice:nth-of-type(2) label')
  // .click('a.nextBtn')
  // 過去一ヶ月以内に今回の来店も含めてこのガストに何度来店されましたか? 残7
  // .wait(1000)
  // .click('.choices>.choice:nth-of-type(4) label')
  // .click('a.nextBtn')
  // 今回のご来店の目的についてお聞かせください 残6
  // .wait(1000)
  // .click('.choices>.choice:nth-of-type(2) label')
  // .click('a.nextBtn')
  // 一緒に来店された人数についてお聞かせください。 残5
  // 一人, 二人, 三人, 四人, 五人, 六人以上
  // .wait(1000)
  // .click('.choices>.choice:nth-of-type(1) label')
  // .click('a.nextBtn')
  // 一緒に来店された方についてお聞かせください。 残4
  // 配偶者または恋人, 12歳未満の子どもを含む家族, 12歳未満の子どもを含まない家族, 友人, 職場の仲間, それ以外
  // .wait(1000)
  // .click('.choices>.choice:nth-of-type(6) label')
  // .click('a.nextBtn')
  // 性別をお聞かせください 残3
  // 女性, 男性
  // .wait(1000)
  // .click('.choices>.choice:nth-of-type(2) label')
  // .click('a.nextBtn')
  // 年齢をお聞かせください 残2
  // 20歳未満, 20-29歳, 30-39歳, 40-49歳, 50-59歳, 60-69歳, 70歳以上  
  // お客様の世帯所得についてお聞かせください 残1
  // 200万未満, 200-349万, 350-499万, 500-649万, 650-799万, 800万以上
  // .wait(1000)
  // .click('.choices>.choice:nth-of-type(2) label')
  // .click('a.nextBtn')
  // .evaluate(() => document.querySelector('textarea.faInput'))
  // .then(function(result){
  //   console.log("result");
  //   console.log(result);
  // })
  // .catch(function(e){
  //   console.dir(e);
  // });
