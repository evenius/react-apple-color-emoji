import * as React from 'react';

// Todo support passing a string, without being too slow?
export type EmojiProps = { icon: any } &  Omit<React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>, 'src'>


export default function Emoji({ icon, ...props }: EmojiProps) {
  return <img src={icon} {...props} />
}
