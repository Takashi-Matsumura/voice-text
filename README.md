# Voice Text - 音声文字起こしアプリ

ブラウザの Web Speech API を使ったリアルタイム音声文字起こしアプリです。
スペースキーを押している間だけ録音し、離すと文字起こし結果が表示されます。

## 機能

- **Push-to-talk 方式** - スペースキー長押しで録音、離すと停止
- **日本語 / 英語 切り替え** - ヘッダーから言語モードを切り替え可能
- **リアルタイム表示** - 認識中のテキストをリアルタイムで表示
- **新しい順に表示** - 最新の文字起こし結果が常に画面上部に表示

## 技術スタック

- [Next.js](https://nextjs.org) 16
- [React](https://react.dev) 19
- [Tailwind CSS](https://tailwindcss.com) 4
- [Web Speech API](https://developer.mozilla.org/ja/docs/Web/API/Web_Speech_API)

## セットアップ

```bash
npm install
npm run dev
```

http://localhost:3000 をブラウザで開いてください。

> **注意:** Web Speech API は Chrome / Edge で動作します。Safari や Firefox では対応していない場合があります。

## 使い方

1. ブラウザで http://localhost:3000 を開く
2. ヘッダーの言語ボタンで「JP 日本語」または「EN English」を選択
3. スペースキーを押し続けながら話す
4. スペースキーを離すと文字起こし結果が表示される

## 今後の予定

- ローカル LLM との連携によるチャット会話の文字起こし
- Whisper 等を使ったローカル音声認識への切り替え

## ライセンス

MIT
