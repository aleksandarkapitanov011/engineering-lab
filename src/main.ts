import './styles/main.css';
import './mechanisms';
import { setLang } from './i18n';
import { Shell } from './app/shell';

setLang('bg');
new Shell(document.getElementById('app')!);
