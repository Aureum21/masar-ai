import test from 'node:test';
import assert from 'node:assert/strict';
import {speechLanguage,speechText,voiceLabels} from '../src/lib/voiceSupport.mjs';

test('voice input and output use the selected MASAR language',()=>{
  assert.equal(speechLanguage('en'),'en-US');
  assert.equal(speechLanguage('ar'),'ar-AE');
  assert.equal(speechLanguage('hi'),'hi-IN');
  assert.equal(speechLanguage('unknown'),'en-US');
  for(const locale of ['en','ar','hi'])assert.ok(voiceLabels[locale].start && voiceLabels[locale].listen);
});

test('spoken replies omit markdown images and links while retaining readable text',()=>{
  assert.equal(speechText('## Visit **Dubai**\n[Read more](https://example.com) ![photo](https://example.com/p.jpg)'), 'Visit Dubai Read more');
  assert.equal(speechText('```js\nsecretCode()\n```\nHello'), 'Hello');
});
