import { writeFile, stat, readFile } from 'fs/promises';
import lib from 'emojilib/dist/emoji-en-US.json'
import { join, resolve } from 'path';
import emojiUnicode from 'emoji-unicode'
import { createWriteStream } from 'fs';

const { Readable } = require('stream');
const { finished } = require('stream/promises');


// const emojiList = Object.keys(lib) as (keyof typeof lib)[]

const specialCharPattern = ['_',' ', '\\-', ':', ',', '\\.', '’', '!', '(', ')', '“', '”', '&'].join('');
const normalCharPattern = 'A-z0-9#*'
const specialCaseReplace = (str: string) => replaceNumbersWithWords(str.replace(/\*/, 'asterisk').replace(/#/g, 'number-sign'));

const specialChars = new RegExp(`[${specialCharPattern}]{1,}([${normalCharPattern}])`, 'g')
const endingSpecialChar = new RegExp(`[${specialCharPattern}]+$`)

const anySpecialChar = new RegExp(`[${specialCharPattern}]+`);
const undefinedChars = new RegExp(`[^${normalCharPattern}${specialCharPattern}]+`);

const isImplemented = (name: string) => {

  if(name.includes('facing right')) { return false }
  if(name.includes('snowboarder:')) { return false }
  if(name.includes('person in bed:')) { return false }
  if(name.includes('broken chain')) { return false }
  if(name.includes('family: adult')) { return false }
  if(name.includes('female sign')) { return false }
  if(name.includes('male sign')) { return false }
  if(name.includes('phoenix')) { return false }
  return true
}


function ucFirst(str: string) {
  return str.slice(0, 1).toUpperCase() + str.slice(1);
}

function toCamelCase(str: string) {
  return str.replace(specialChars, function(_, letter) {
    return letter.toUpperCase();
  }).replace(endingSpecialChar, '');
}

function replaceNumbersWithWords(input: string): string {
  const numberToWord: { [key: string]: string } = {
      '0': 'zero',
      '1': 'one',
      '2': 'two',
      '3': 'three',
      '4': 'four',
      '5': 'five',
      '6': 'six',
      '7': 'seven',
      '8': 'eight',
      '9': 'nine'
  };

  const isKeycap = input.includes('keycap');
  return input.replace(/[0-9]/g, match => {

    return (isKeycap ? 'digit ' : '') + numberToWord[match]
  });
}


const emojiTypeUnionTypes: string[] = [];
const emojiDefinitions: [type: string, name: string][] = [];
const definitionInfo: [normalName: string, definitionFile: string, emoji: string, aliases: string[]][] = [];

const used = new Set<string>();

const missing: [string, string, string, string[]][] = [];
 
const chunkArray = <T>(arr: T[], size: number) => {
  const chunked_arr: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const last = chunked_arr[chunked_arr.length - 1];
    if (!last || last.length === size) {
      chunked_arr.push([arr[i]]);
    } else {
      last.push(arr[i]);
    }
  }
  return chunked_arr;
}


async function writeData() {

  // const emojipediaCache = await readFile(resolve(__dirname, 'emojipedia-canonical-names.json'), 'utf8').then(JSON.parse).catch(() => void 0)
  const emojiList = (await getOfficialEmojiList()).filter(({name}) => isImplemented(name));
  // const emojiMap = emojiList.reduce((map, emoji) => {
  //   map.set(emoji.emoji, emoji.name);
  //   return map;
  // }, new Map<string, string>)

  const emojiFetchers = emojiList.map(({ emoji, codePoints, name }) => async () => {

    const officialCanonicalName = specialCaseReplace(name.normalize('NFKD').replace(/[\u0300-\u036F]/g, ''));

    if(!officialCanonicalName) {
      throw new Error("WHAT THE FUCK :'" +  emoji + "'");
    }

    // @ts-ignore
    const aliases: string[] = [officialCanonicalName, ...(lib[emoji] ?? [])];
  
    if (undefinedChars.test(officialCanonicalName)) {
      const badMatch = new RegExp(undefinedChars, 'g');
      const badChars = Array.from(officialCanonicalName.matchAll(badMatch))
      
      throw new Error(`unhandled character in key '${officialCanonicalName}: ${badChars.map((match) => `'${match[0]}' at position '${match.index}'`)} ''`)
    }

    let canonicalName = ucFirst(anySpecialChar.test(officialCanonicalName) ? toCamelCase(aliases[0]) : aliases[0]); 

    if(used.has(canonicalName)) {
      let i = 2;
      while(used.has(canonicalName+i)) {
        i++
      }
      canonicalName = canonicalName+i;
    }

    used.add(canonicalName);
  
    // const utf16 = emojiUnicode.raw(emoji).split(' ').map(val => parseInt(val).toString(16));
    const utf16 = codePoints.trim().split(' ').map((point, i) => {
      const uCode = point.slice(2).toLowerCase();
      if(i === 0) return uCode.replace(/^[0]+/, '')
      return uCode
    });

    const fileName = `emoji_u${utf16.join('_')}.png`;
  
    // Check if file exists:
    const aliasEmojiTypeName = `Emoji${canonicalName}`;
  
    console.log("CHecking ", fileName)
    try {
      await stat(resolve(__dirname, `../png/160/${fileName}`));
    } catch (e) {
      missing.push([fileName, utf16.join('-'), emoji, aliases]);
      // missing.push([`${fileName} (${aliases.join(', ')})`);
      return
      // throw new Error(`File not found: ${fileName} (${aliases.join(', ')})`)
    }
  
  
    emojiTypeUnionTypes.push(aliasEmojiTypeName);
    const aliasEmojiType = `export type ${aliasEmojiTypeName} = ${aliases.map(alias => `"${alias}"`).join(' | ')};`
    const aliasEmojiName = `export { default as em${canonicalName} } from './icons/em${canonicalName}.js';`
    const emojiDefinitionFile = emojiDefinitionFileTemplate(canonicalName, aliases, fileName, "u" + utf16.join('_'), 160, 160);
    emojiDefinitions.push(
      [aliasEmojiType, aliasEmojiName]
    )
  
    definitionInfo.push(
      [canonicalName, emojiDefinitionFile, emoji, aliases]
    )
  })

  let chunkedFetchers = chunkArray(emojiFetchers, 50);

  for (const chunk of chunkedFetchers) {
    await Promise.all(chunk.map(fetcher => fetcher()))
  }

  

  if(missing.length > 0) {
    console.warn(`Missing files: ${missing.join(',\n')}`)
    console.warn(missing.length + ` missing files found.`)

    const imgFetchers = missing.map(([fileName, utf16, emoji, aliases]) => () => getFromEmojiPedia(fileName, aliases[0], utf16, emoji))
    let chunkedFetchers = chunkArray(imgFetchers, 50);

    for (const chunk of chunkedFetchers) {
      await Promise.all(chunk.map(fetcher => fetcher()))
      console.log("fetched chunk, waiting 150ms");
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    console.log("Missing files fetched, run again")
  }

  await Promise.all(definitionInfo.map(
    ([normalName, definitionFile]) => writeFile(
        resolve(__dirname, `../src/icons/em${normalName}.ts`), 
        definitionFile
    )
  ));
  
  const emojiAliasTypeUnionString = `export type EmojiAlias = ${emojiTypeUnionTypes.join(' |\n')};`
  // const emojiTypeUnion = `export type Emoji = ${emoji};`

  await writeFile(
    resolve(__dirname, '../src/emojis.ts'), 
`
// This file is auto-generated by script/buildTypes.ts

${emojiDefinitions.map((def) => def.join('\n')).join('\n')}

${emojiAliasTypeUnionString}
`) 

}

async function getFromEmojiPedia(fileName: string, alias: string, utf16: string, emoji: string, override?: string) {
  const emojipediaAlias = alias.replace(/[_ :,\.]/g, '-').replace(/[’!()“”]/g, '').replace(/[\-]{2,}/g,'-').toLowerCase();
  const url = override ?? `https://em-content.zobj.net/source/apple/354/${emojipediaAlias}_${utf16}.png`
  let result = await fetch(url)

  if(!result.ok) {
    if(emojipediaAlias === 'medical-symbol') {
      return getFromEmojiPedia(fileName, 'staff-of-aesculapius', utf16, emoji, 'https://em-content.zobj.net/source/apple/96/staff-of-aesculapius_2695.png');
      // keycap-number-sign
    } else if (utf16 === '23-fe0f-20e3') {
      return getFromEmojiPedia(fileName, 'keycap-number-sign', utf16, emoji);
    } else if (emojipediaAlias === 'head-shaking-vertically') {
      return getFromEmojiPedia(fileName, emojipediaAlias, utf16, emoji, 'https://em-content.zobj.net/source/emojipedia/370/head-shaking-vertically_1f642-200d-2195-fe0f.png');
    } else if (emojipediaAlias === 'head-shaking-horizontally') {
      return getFromEmojiPedia(fileName, emojipediaAlias, utf16, emoji, 'https://em-content.zobj.net/source/emojipedia/370/head-shaking-horizontally_1f642-200d-2194-fe0f.png');
    } else if (emojipediaAlias === 'lime') {
      return getFromEmojiPedia(fileName, emojipediaAlias, utf16, emoji, 'https://em-content.zobj.net/source/emojipedia/370/lime_1f34b-200d-1f7e9.png');
    } else if (emojipediaAlias === 'brown-mushroom') {
      return getFromEmojiPedia(fileName, emojipediaAlias, utf16, emoji, 'https://em-content.zobj.net/source/emojipedia/370/brown-mushroom_1f344-200d-1f7eb.png');
    } else if (emojipediaAlias === 'registered') {
      return getFromEmojiPedia(fileName, emojipediaAlias, utf16, emoji, 'https://em-content.zobj.net/source/apple/354/registered_ae-fe0f.png');
    } else if (emojipediaAlias === 'copyright') {
      return getFromEmojiPedia(fileName, emojipediaAlias, utf16, emoji, 'https://em-content.zobj.net/source/apple/354/copyright_a9-fe0f.png');
    }
    throw Error("Failed to fetch: " + url + " " + result.statusText + " for emoji " + emoji );
  }

  const destination = resolve(__dirname, '../png/160', fileName);
  const fileStream = createWriteStream(destination);
  
  console.log("Will write, ", join('png/160', fileName));
  await finished(Readable.fromWeb(result.body).pipe(fileStream));
  
  console.log("written");
}

function emojiDefinitionFileTemplate (normalisedName: string, aliases: string[], fileName: string, unicode: string, width: number, height: number) { return `// This file is auto-generated by script/buildTypes.ts
// Emoji definition for ${normalisedName}
import type { AppleIconDefinition } from "../index.js";
import png from "../png/160/${fileName}";

export const icon = png;
export const name = "${normalisedName}";
export const aliases = ${JSON.stringify(aliases)};
export const width = ${width};
export const height = ${height};
export const unicode = "${unicode}";

export default {
  icon,
  name,
  aliases,
  width,
  height,
  unicode,
} as AppleIconDefinition;
`}


const getOfficialEmojiList = () => 
  fetch(`https://unicode.org/emoji/charts/emoji-ordering.txt`).then(res => res.text()).then(result => {
    const entries = result.split('\n');
    const nonEntry = (line: string) => !line.startsWith('#') && line.length > 0;
    return entries.filter(nonEntry).map((entry) => {
      const [ codePoints, rest ] = entry.split(";");
      let data = rest.trim().slice(rest.indexOf('#') + 1); 
      data = data.trim();
      const sepIndex = data.indexOf(' ')

      const emoji = data.slice(0, sepIndex);
      const name = data.slice(sepIndex + 1);

      return { emoji, name, codePoints }
    
    })
  })

writeData();
