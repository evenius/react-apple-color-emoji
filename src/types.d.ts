declare module "*.png" {
  const value: string;
  export default value;
}

declare module "emoji-unicode" {

  interface EmojiUnicode {
    /**
  * emojiUnicode
  * Get the unicode code of an emoji in base 16.
  *
  * @name emojiUnicode
  * @function
  * @param {String} input The emoji character.
  * @returns {String} The base 16 unicode code.
  */
    (input: string): string;

    /**
   * emojiunicode.raw
   * Get the unicode code points of an emoji in base 16.
   *
   * @name emojiunicode.raw
   * @function
   * @param {String} input The emoji character.
   * @returns {String} The unicode code points.
   */
    raw (input: string): string;
  }
  

  const emojiUnicode: EmojiUnicode;
  export default emojiUnicode;

}
