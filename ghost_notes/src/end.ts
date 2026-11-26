import type { Song } from './audio';

/** The end card (#end in index.html): once the song finishes, offer to play it again or go back to the song list. */
export function endScreen(song: Song) {
  const el = document.getElementById('end')!;
  const [again, exit] = el.querySelectorAll('button');
  song.el.addEventListener('ended', () => {
    el.classList.add('show');
    again.focus();
  });
  song.el.addEventListener('play', () => el.classList.remove('show'));
  again.addEventListener('click', () => {
    song.el.currentTime = 0;
    song.el.play();
  });
  // songs are served side by side under the landing page (/songs/<folder>/)
  exit.addEventListener('click', () => location.assign(new URL('../', location.href)));
  // Enter/Space belong to the focused button, not the global play/pause handler
  el.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') e.stopPropagation(); });
}
