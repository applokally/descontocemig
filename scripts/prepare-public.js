import { cpSync, copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';

const output = 'public';
const directories = ['assets', 'cadastrar_conta', 'admin'];
const files = [
  'index.html',
  'politica-de-privacidade.html',
  'termos-de-uso.html',
  'obrigado.html'
];

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const directory of directories) {
  if (existsSync(directory)) cpSync(directory, output + '/' + directory, { recursive: true });
}

for (const file of files) {
  if (existsSync(file)) copyFileSync(file, output + '/' + file);
}

console.log('Static output prepared in public/');
