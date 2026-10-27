export type Appearance = {
  character: "peach" | "lavender";
  hair: "original" | "espresso" | "copper";
  outfit: "original" | "mint" | "sky" | "rose";
};
export type WorldPlayer = {
  id: string;
  username: string;
  x: number;
  y: number;
  color: string;
  table?: string;
  seat?: string;
  facing?: Facing;
  appearance?: Appearance;
};
export type WorldMessage = {
  id: string;
  from: string;
  username: string;
  text: string;
  scope?: string;
  at: number;
};
export type WorldEmote = { text: string; until: number };
export type Facing = "front-left" | "front-right" | "back-left" | "back-right";
export type Motion = { facing: Facing; until: number };
