import type { Scene } from './scene';
import { scenes1 } from './scenes1';
import { scenes2 } from './scenes2';
import { scenes3 } from './scenes3';

/** The whole video, scene by scene, in order. Each scene illustrates a line (or two) of the song. */
export const SCENES: Scene[] = [...scenes1, ...scenes2, ...scenes3];
