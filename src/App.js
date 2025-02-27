import React, { memo, useRef, useState } from 'react';
import './App.css';

// ノーミス時は「PERFECT!!!」のみを表示したいので、numOfMissを参照するために1つのコンポーネントにまとめる
const Status = memo(function Status({ timerState, numOfQuestions, numOfMiss }) {
  const qText = (timerState === 'stop') ? 'CLEAR!' : `残り${numOfQuestions}問`;
  const qStyle = {
    marginRight: '18px',
    fontSize: (timerState === 'stop') ? '24px' : '18px',
    color: (timerState === 'stop') ? 'yellow' : 'inherit',
    display: (timerState === 'stop' && numOfMiss === 0) ? 'none' : 'inline'
  };

  const mText = (timerState === 'stop' && numOfMiss === 0) ? 'PERFECT!!!' : `Miss ${numOfMiss}`;
  const mStyle = (timerState === 'stop' && numOfMiss === 0) ? {
    fontSize: '24px',
    background: 'linear-gradient(to right,#e60000,#f39800,#fff100,#009944,#0068b7,#1d2088,#920783)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: 'bold',
    animation: '0.8s ease-out 0s infinite perfect alternate'
  } : {fontSize: '18px'};
  
  return (
    <div>
      <span style={qStyle}>{qText}</span><span style={mStyle}>{mText}</span>
    </div>
  );
});

// 画面全体を更新するとパフォーマンスが落ちるので、タイマーは個別で更新できるようにする
// memo化することで、親コンポーネントが再レンダリングされる際でも再レンダリングされないようにする。
// 再レンダリングされるのは、propsが変更された時と、自身のstateが変更された時。
const CurrentTime = memo(function CurrentTime({ timerState }) {
  const [timerCurrentTime, setTimerCurrentTime] = useState(0);
  // レンダリング時にstateが更新されると、それをトリガーに再レンダリングされるループに陥るので、refで定義する。
  const timerStartTime = useRef(0);
  const intervalId = useRef(null);

  switch(timerState){
    case 'start':
      if(intervalId.current !== null) break;
      timerStartTime.current = performance.now();
      let id = setInterval(() => {
        const elapsedTimeMs = performance.now() - timerStartTime.current;
        setTimerCurrentTime(elapsedTimeMs);
      }, 100);
      intervalId.current = id;
      break;
    case 'stop':
      clearInterval(intervalId.current);
      intervalId.current = null;
      timerStartTime.current = 0;
      break;
  }

  const timerString = (elapsedTimeMs) => {
    const minutes = Math.trunc(elapsedTimeMs / 60000);
    const seconds = Math.trunc( (elapsedTimeMs % 60000) / 1000 );
    const milliSeconds =  Math.trunc(elapsedTimeMs % 1000);

    return (minutes > 99 ? 99 : minutes).toString().padStart(2, '0')
      + ':' + (minutes > 99 ? 59 : seconds).toString().padStart(2, '0')
      + '.' + (minutes > 99 ? 999 : milliSeconds).toString().padStart(3, '0');
  };

  const cStyle = {
    fontSize: (timerState === 'stop') ? '24px' : '18px',
    fontWeight: (timerState === 'stop') ? 'bold' : 'normal',
  };

  return <div style={cStyle}>{timerString(timerCurrentTime)}</div>;
});

// answerだけだと、前回と同じ値が代入されてpropsの値が更新されない可能性がある。
const Question = memo(function Question({ answer, numOfQuestions, insertedQuestionAnime }) {
  // 親要素のサイズを取得する
  const containerRect = document.getElementById('questionContainer').getBoundingClientRect();
  // 正方形なのでどちらも同じ値になるが、コードの分かりやすさのために両方取得する。
  const cWidth = containerRect.width;
  const cHeight = containerRect.height;

  // 回転させすぎると見えなくなるので注意
  const rotateDeg = getRandomInt(4, 48) * 45;
  // どの軸を中心に回転するか（x, y, z）
  const axis = [
    [1,0,0],[0,1,0],[0,0,1],
    [1,1,0],[1,0,1],[0,1,1],[1,1,1]
  ][getRandomInt(0, 6)];
  // 一辺の長さを1としたコンテナの辺上の座標を表す
  const startPosition = [
    [0,0],[0.5,0],[1,0],[1,0.5],
    [1,1],[0.5,1],[0,1],[0,0.5]
  ][getRandomInt(0, 7)];
  const isHorizontal = (getRandomInt(0, 1) === 0) ? true : false;
  // 座標計算のために要素のサイズが欲しいので、フォントサイズから要素のサイズを決定する
  // コンテナサイズはビューポートサイズに依存しているので、そこからはみ出ないようにコンテナサイズを基に算出する
  const fontSize = getRandomInt(Math.floor(cWidth/18), Math.floor(cWidth/3));
  const qWidth = (isHorizontal) ? fontSize*3 : fontSize;
  const qHeight = (isHorizontal) ? fontSize : fontSize*3;
  // コンテナからはみ出たQuestionの大きさを考慮する
  const distanceX = (startPosition[0] === 0.5) ? 0
                  : (startPosition[0] === 0) ? cWidth + qWidth : -(cWidth + qWidth);
  const distanceY = (startPosition[1] === 0.5) ? 0
                  : (startPosition[1] === 0) ? cHeight + qHeight : -(cHeight + qHeight);
  // アニメを動的に置き換える（アニメ名はそれぞれ変えないと、上書きした時に途中から再生されてしまう）
  // ビルド時に空のスタイルは削除されるので、定義しておいた空の@keyframesを上書きするという手段は取れない。
  const appCssRules = document.styleSheets[0];
  if(insertedQuestionAnime.current) {
    appCssRules.deleteRule(0);
  } else {
    insertedQuestionAnime.current = true;
  }
  appCssRules.insertRule(`
    @keyframes anime${numOfQuestions} {
      from {
        transform: translate(0) rotate3d(${axis[0]}, ${axis[1]}, ${axis[2]}, 0deg);
      }
      to {
        transform: translate(${distanceX}px, ${distanceY}px) rotate3d(${axis[0]}, ${axis[1]}, ${axis[2]}, ${rotateDeg}deg);
      }
    }
  `);

  // 3s～12sの間が今のところ丁度いいかな～
  const duration = getRandomInt(30, 120) * 0.1;
  // 基本16色から背景色のblackだけ除く
  const textColor = [
    'gray','silver','white','blue','navy',
    'teal','green','lime','aqua','yellow',
    'red','fuchsia','olive','purple','maroon'
  ][getRandomInt(0, 14)];
  // 次のスタート地点の座標を計算する
  const left = startPosition[0]*cWidth + (startPosition[0] - 1)*qWidth;
  const top = startPosition[1]*cHeight + (startPosition[1] - 1)*qHeight;
  // JavaScriptでは、「user-select」などの「-」が入るプロパティ名は「-」を取ってキャメルケースにする必要がある。
  const qStyle = {
    position: 'absolute',
    userSelect: 'none',
    lineHeight: `${fontSize}px`,
    height: `${qHeight}px`,
    width: `${qWidth}px`,
    left: `${left}px`,
    top: `${top}px`,
    writingMode: (isHorizontal) ? 'horizontal-tb' : 'vertical-rl',
    fontSize: `${fontSize}px`,
    color: textColor,
    animation: `${duration}s linear 0s infinite anime${numOfQuestions}`
  };

  let questionText;
  switch(answer){
    case 1:
      questionText = 'きのこ';
      break;
    case 2:
      questionText = 'きなこ';
      break;
    case 3:
      questionText = [
        'きばこ','きりこ','きんこ','きねこ','きぶこ',
        'きむこ','きのみ','きのう','きのと','きのん',
        'きのえ','きのか','きのめ','きのり','きのじ',
        'きない','きなか','きなが','きなり','きなし',
        'きなん','きなひ','きなや','きなれ','あのこ',
        'いのこ','えのこ','ひのこ','このこ','じのこ',
        'すのこ','つのこ','ぬのこ','おのこ','めのこ',
        'ゆのこ','かのこ','とのこ','まなこ','もなこ',
        'ななこ','ふなこ','たなこ','ぶなこ'
      ][getRandomInt(0, 43)];
      break;
  }

  return <div style={qStyle}>{questionText}</div>;
});

export default function App() {
  const [timerState, setTimerState] = useState(null);
  const [startedGame, setStartedGame] = useState(false);
  // 正誤判定のために、answerはApp側で保持していなければならない
  const [answer, setAnswer] = useState(0);
  const [numOfQuestions, setNumOfQuestions] = useState(0);
  const [numOfMiss, setNumOfMiss] = useState(0);
  // Questionコンポーネントはゲームが終わる度に破棄されるので、代わりにrefの値を保持しておく。
  const insertedQuestionAnime = useRef(false);

  const startGame = () => {
    setStartedGame(true);
    setTimerState('start');
    decideNextAnswer();
    setNumOfQuestions(30);
    setNumOfMiss(0);
  };

  const decideNextAnswer = () => {
    const answerIndicator = getRandomInt(1, 100);
    if(answerIndicator <= 43) { // きのこ
      setAnswer(1);
    } else if(answerIndicator <= 86) { // きなこ
      setAnswer(2);
    } else { // その他
      setAnswer(3);
    }
  };

  const judgeAnswer = (inAnswer) => {
    if(inAnswer === answer){
      if(numOfQuestions === 1){
        setStartedGame(false);
        setTimerState('stop');
      } else {
        setNumOfQuestions(numOfQuestions - 1);
        decideNextAnswer();
      }
    } else {
      setNumOfMiss(numOfMiss + 1);
    }
  };

  return (
    <div className="App">
      <div id="questionContainer">
        {startedGame && 
          <Question answer={answer} numOfQuestions={numOfQuestions} insertedQuestionAnime={insertedQuestionAnime}/>}
      </div>
      {timerState === null &&
        <div className="explain">
          <div>現れる単語が「<b>きのこ</b>」か「<b>きなこ</b>」かを素早く判断しよう</div>
          <div>たまに<u>紛らわしい単語</u>が現れるかも……</div>
        </div>
      }
      {!startedGame &&
        <button className="startButton" onClick={startGame}>START</button>}
      {timerState !== null &&
        <CurrentTime timerState={timerState} />}
      {timerState !== null &&
        <Status timerState={timerState} numOfQuestions={numOfQuestions} numOfMiss={numOfMiss}/>}
      {startedGame &&
        <div className="buttons">
        <button onClick={() => judgeAnswer(1)}>きのこ</button>
        <button onClick={() => judgeAnswer(3)}>その他</button>
        <button onClick={() => judgeAnswer(2)}>きなこ</button>
      </div>}
    </div>
  );
}

function getRandomInt(min, max){
  return Math.floor( Math.random() * (max + 1 - min) ) + min;
}