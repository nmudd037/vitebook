import type { StoryMeta } from '@vitebook/client';
import { Variant } from '@vitebook/preact';

import Button from './Button';

export const __storyMeta: StoryMeta = {
  title: 'Button',
  description: 'My awesome button.',
};

function ButtonStory() {
  return (
    <>
      <Variant name="Default" description="The default button.">
        <Button />
      </Variant>

      <Variant name="Disabled" description="The disabled button.">
        <Button disabled />
      </Variant>
    </>
  );
}

ButtonStory.displayName = 'ButtonStory';

export default ButtonStory;
