import { runSpike } from './spike';

const root = document.getElementById('root')!;
const pre = document.createElement('pre');
root.appendChild(pre);
runSpike((line) => {
  pre.textContent += line + '\n';
});
