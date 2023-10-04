import * as React from 'react';
import styled from '@emotion/styled';

export interface AppleIconDefinition {
  icon: Promise<typeof import("*.webp")> | string;
  name: string;
  aliases: string[];
  width: number;
  height: number;
  unicode: string;
}

// Todo support passing a string, without being too slow?
export type EmojiProps = { icon: AppleIconDefinition, inline?: boolean } &  Omit<React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>, 'src'>

const EmojiImage = styled.img<{ inline?: boolean }>`
  display: ${props => props.inline ? 'inline-block' : 'block'};
  height: ${props => props.inline ? '1em' : '1.5em'};
  width: ${props => props.inline ? '1em' : '1.5em'};
  vertical-align: ${props => props.inline ? 'text-bottom' : 'middle'};
`;

function Emoji({ icon, inline, ...props }: EmojiProps) {
  let src = React.useRef('')
  React.useEffect(() => {
    if(typeof icon.icon === 'string') {
      src.current = icon.icon
      return
    } else {
      icon.icon.then((url) => {
        src.current = url as unknown as string
      })
    }
  }, [ icon.icon ])
  return <EmojiImage src={src.current} height={icon.height} width={icon.width} alt={icon.aliases[0]} {...props} />
}

const memoji = React.memo(Emoji)
memoji.displayName = 'Emoji';

export default Emoji;
