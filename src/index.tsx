import * as React from 'react';
import type { EmojiAlias } from './emojis';

export type EmojiProps = { icon: any } &  Omit<React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>, 'src'>
// export type EmojiProps = {
//   name: EmojiAlias
// } | { icon: any }

export default function Emoji({ icon, ...props }: EmojiProps) {
  return <img src={icon} {...props} />
}
