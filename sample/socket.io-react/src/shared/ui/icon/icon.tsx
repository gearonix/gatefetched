import clsx from 'clsx'
import type { SVGProps } from 'react'
import type { SpritesMap } from './sprite.gen'
import { SPRITES_META } from './sprite.gen'

export interface IconProps extends SVGProps<SVGSVGElement> {
  name: AnyIconName
}

export type AnyIconName = {
  [Key in keyof SpritesMap]: IconName<Key>
}[keyof SpritesMap]

export type IconName<Key extends keyof SpritesMap> = `${Key}/${SpritesMap[Key]}`

export const Icon = ({ className, name, ...props }: IconProps) => {
  const { axis, filePath, iconName, viewBox } = getIconMeta(name)

  return (
    <svg
      className={clsx('icon', className)}
      viewBox={viewBox}
      data-axis={axis}
      focusable="false"
      aria-hidden
      {...props}
    >
      <use href={`/sprites/${filePath}#${iconName}`} />
    </svg>
  )
}

const getIconMeta = <Key extends keyof SpritesMap>(name: IconName<Key>) => {
  const [spriteName, iconName] = name.split('/') as [Key, SpritesMap[Key]]
  const {
    filePath,
    items: {
      [iconName]: { height, viewBox, width }
    }
  } = SPRITES_META[spriteName]
  const axis = width === height ? 'xy' : width > height ? 'x' : 'y'

  return { axis, filePath, iconName, viewBox }
}
