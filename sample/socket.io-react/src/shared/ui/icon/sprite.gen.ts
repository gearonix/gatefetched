export interface SpritesMap {
  sprite: "github-mark";
}
export const SPRITES_META: {
  [Key in keyof SpritesMap]: {
    filePath: string;
    items: Record<
      SpritesMap[Key],
      {
        viewBox: string;
        width: number;
        height: number;
      }
    >;
  };
} = {
  sprite: {
    filePath: "sprite.a428f768.svg",
    items: {
      "github-mark": {
        viewBox: "0 0 98 96",
        width: 98,
        height: 96,
      },
    },
  },
};
