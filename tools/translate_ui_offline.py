"""Draft missing UI translations locally. Never downloads models or calls an API.

Install tools/requirements-translation.txt in a separate environment and download
English-to-Arabic/Hindi Argos-format models separately. Review drafts before release.
"""
import argparse
from collections import Counter
import html
import json
from pathlib import Path
import re


def slots(value):
    return Counter(re.findall(r'⟦(\d+)⟧', value))


def generate(models_dir, locales_dir, languages):
    import ctranslate2
    import sentencepiece

    source=json.loads((locales_dir/'en.json').read_text(encoding='utf-8'))
    review_path=locales_dir.parent/'reviewed.json'
    reviewed=json.loads(review_path.read_text(encoding='utf-8')) if review_path.exists() else {}
    reviewed_folded={key.casefold():value for key,value in reviewed.items()}
    packages={}
    for path in models_dir.rglob('metadata.json'):
        meta=json.loads(path.read_text(encoding='utf-8'))
        if meta.get('from_code')=='en' and meta.get('to_code') in languages:packages[meta['to_code']]=path.parent
    failed=[]
    for language in languages:
        if language not in packages:raise SystemExit(f'No English-to-{language} model found in the supplied directory.')
        target=locales_dir/f'{language}.json'
        data=json.loads(target.read_text(encoding='utf-8')) if target.exists() else {}
        package=packages[language]
        tokenizer=sentencepiece.SentencePieceProcessor(model_file=str(package/'sentencepiece.model'))
        translator=ctranslate2.Translator(str(package/'model'),device='cpu',compute_type='int8',intra_threads=4)
        keys=[key for key in source if key not in data]
        for start in range(0,len(keys),32):
            batch=keys[start:start+32]
            inputs=[re.sub(r'⟦(\d+)⟧',lambda m:str(99000000+int(m[1])),key) for key in batch]
            results=translator.translate_batch([tokenizer.encode(text,out_type=str) for text in inputs],
                beam_size=2,replace_unknowns=True,max_decoding_length=512)
            for key,result in zip(batch,results):
                value=html.unescape(tokenizer.decode(result.hypotheses[0]).strip())
                for index in slots(key):
                    digits=str(99000000+int(index))
                    pattern=r'[,،.\s]*'.join('['+digit+chr(0x660+int(digit))+chr(0x966+int(digit))+']' for digit in digits)
                    value=re.sub(pattern,'⟦'+index+'⟧',value)
                if not value or slots(value)!=slots(key):failed.append((language,key));continue
                data[key]=value
        # Human-reviewed terminology always wins, including case variants.
        for key in source:
            pair=reviewed.get(key) or reviewed_folded.get(key.casefold())
            if pair:data[key]=pair[0 if language=='ar' else 1]
        clean={key:data[key] for key in source if key in data}
        temporary=target.with_suffix('.json.tmp')
        temporary.write_text(json.dumps(clean,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        temporary.replace(target)
        print(f'{language}: {len(clean)}/{len(source)} messages present; {len(keys)} new draft candidates.')
    if failed:
        print(f'{len(failed)} messages could not preserve interpolation slots. Translate these manually:')
        for language,key in failed:print(language,repr(key))
        return 1
    return 0


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--models-dir',type=Path,required=True)
    parser.add_argument('--locales-dir',type=Path,default=Path(__file__).resolve().parents[1]/'frontend/src/i18n/locales')
    parser.add_argument('--language',action='append',choices=['ar','hi'])
    args=parser.parse_args()
    raise SystemExit(generate(args.models_dir.resolve(),args.locales_dir.resolve(),args.language or ['ar','hi']))
