export interface Wish {
  id: string;
  sender: string;
  text: string;
  color: 'blue' | 'green' | 'teal' | 'turquoise';
  timestamp: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
  isCustom?: boolean;
}

export interface GameBalloon {
  id: number;
  x: number;
  y: number;
  speedY: number;
  size: number;
  color: string;
  text: string;
  isPopped: boolean;
}
